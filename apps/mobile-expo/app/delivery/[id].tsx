import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Pressable,
  ImageSourcePropType,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { getLocalDelivery, updateLocalDeliveryStatus, upsertDeliveries } from '../../database/deliveries.repo';
import { markLocalEvidenceSynced, saveLocalEvidence } from '../../database/evidence.repo';
import {
  enqueueSyncItem,
  saveLocalGpsLog,
  saveLocalIncident,
} from '../../offline/queue';
import {
  updateDeliveryStatus,
  uploadEvidence,
  createIncident,
  sendGpsLog,
  fetchDeliveryById,
} from '../../services/api';
import { loadPhotosForDelivery, type DeliveryPhoto } from '../../services/evidenceLoader';
import { isDeliveryCompleted } from '../../lib/deliveryListUtils';
import { isOnline, syncOfflineQueue } from '../../sync/syncManager';
import { notifyDeliveriesSync } from '../../sync/syncEvents';
import { useAuthStore } from '../../store/auth.store';
import { emitGpsUpdate } from '../../sockets/client';
import {
  DELIVERY_STATUS_LABELS,
  INCIDENT_LABELS,
  PRIORITY_LABELS,
} from '../../constants/labels';
import type { DeliveryDTO } from '@pharma/types';

const MAX_PHOTOS = 2;

function EvidenceImage({ photo }: { photo: DeliveryPhoto }) {
  const token = useAuthStore((s) => s.accessToken);
  const source: ImageSourcePropType = photo.uri.startsWith('http')
    ? { uri: photo.uri, headers: { Authorization: `Bearer ${token}` } }
    : { uri: photo.uri };

  return <Image source={source} style={styles.preview} />;
}

function buildDeliveryObservations(deliveryNotes?: string): string | undefined {
  return deliveryNotes?.trim() || undefined;
}

export default function DeliveryDetailScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryDTO | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<DeliveryPhoto[]>([]);
  const [online, setOnline] = useState(true);
  const [gps, setGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [incidentPickerOpen, setIncidentPickerOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [incidentNotes, setIncidentNotes] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const refreshPhotos = useCallback(async () => {
    if (!id) return;
    setPhotos(await loadPhotosForDelivery(id, MAX_PHOTOS));
  }, [id]);

  const loadDelivery = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    setOnline(await isOnline());

    let data = await getLocalDelivery(id);
    if (!data) {
      try {
        const remote = (await fetchDeliveryById(id)) as DeliveryDTO;
        await upsertDeliveries([remote]);
        data = remote;
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la entrega');
        setDelivery(null);
        setPhotos([]);
        return;
      }
    } else if (await isOnline()) {
      try {
        const remote = (await fetchDeliveryById(id)) as DeliveryDTO;
        await upsertDeliveries([remote]);
        data = (await getLocalDelivery(id)) || remote;
      } catch {
        // Sin servidor: usar copia local
      }
    }

    setDelivery(data);
    await refreshPhotos();
  }, [id, refreshPhotos]);

  useFocusEffect(
    useCallback(() => {
      loadDelivery();
      captureGps();
    }, [loadDelivery])
  );

  const captureGps = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy ?? 0,
    };
    setGps(coords);
    emitGpsUpdate(coords.lat, coords.lng, id);

    const online = await isOnline();
    if (online) {
      try {
        await sendGpsLog({ ...coords, deliveryId: id });
      } catch {
        await saveLocalGpsLog(id!, coords.lat, coords.lng, coords.accuracy);
        await enqueueSyncItem('GPS', { deliveryId: id, ...coords });
      }
    } else {
      await saveLocalGpsLog(id!, coords.lat, coords.lng, coords.accuracy);
      await enqueueSyncItem('GPS', { deliveryId: id, ...coords });
    }
  };

  const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset) => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Validación', `Máximo ${MAX_PHOTOS} fotografías permitidas`);
      return;
    }

    if (!asset.base64) {
      Alert.alert('Error', 'No se pudo procesar la imagen. Intente de nuevo.');
      return;
    }

    const localId = await saveLocalEvidence(id!, 'PHOTO', {
      base64Data: asset.base64,
      localPath: asset.uri,
      synced: false,
    });

    const payload = {
      deliveryId: id,
      type: 'PHOTO',
      base64: asset.base64,
      fileName: 'photo.jpg',
      lat: gps?.lat,
      lng: gps?.lng,
    };

    const connected = await isOnline();
    if (connected) {
      try {
        const uploaded = (await uploadEvidence(id!, 'PHOTO', asset.uri, gps?.lat, gps?.lng)) as {
          id: string;
        };
        await markLocalEvidenceSynced(localId, uploaded.id);
      } catch {
        await enqueueSyncItem('EVIDENCE', payload);
      }
    } else {
      await enqueueSyncItem('EVIDENCE', payload);
    }

    await refreshPhotos();
  };

  const takePhoto = async () => {
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    if (cam.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la cámara');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0]);
    }
  };

  const pickFromGallery = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (lib.status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      base64: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0]);
    }
  };

  const queueIncident = async (type: string, notes?: string) => {
    const label = INCIDENT_LABELS[type] || type;
    const description = notes?.trim()
      ? `${label}: ${notes.trim()}`
      : `Incidencia: ${label}`;
    const payload = {
      deliveryId: id!,
      type,
      description,
      lat: gps?.lat,
      lng: gps?.lng,
      accuracy: gps?.accuracy,
    };

    await saveLocalIncident(id!, type, description, gps?.lat, gps?.lng);
    await enqueueSyncItem('INCIDENT', payload);
  };

  const sendIncident = async (type: string, notes?: string, online?: boolean) => {
    const label = INCIDENT_LABELS[type] || type;
    const description = notes?.trim()
      ? `${label}: ${notes.trim()}`
      : `Incidencia: ${label}`;
    const payload = {
      deliveryId: id!,
      type,
      description,
      lat: gps?.lat,
      lng: gps?.lng,
      accuracy: gps?.accuracy,
    };

    const isConnected = online ?? (await isOnline());
    if (isConnected) {
      try {
        await createIncident(payload);
        return;
      } catch {
        await queueIncident(type, notes);
        return;
      }
    }
    await queueIncident(type, notes);
  };

  const changeStatus = async (status: string) => {
    if (!delivery || isDeliveryCompleted(delivery.status)) {
      Alert.alert('Entrega cerrada', 'Esta entrega ya fue completada y no admite cambios de estado.');
      return;
    }

    if (status === 'DELIVERED' && photos.length < 1) {
      Alert.alert('Validación', 'Debe subir al menos una fotografía antes de marcar como entregado');
      return;
    }

    setLoading(true);
    try {
      const connected = await isOnline();
      setOnline(connected);
      const observations = buildDeliveryObservations(deliveryNotes);

      const payload = {
        status,
        lat: gps?.lat,
        lng: gps?.lng,
        accuracy: gps?.accuracy,
        observations,
        failureReason: status === 'NOT_DELIVERED' ? observations : undefined,
      };

      await updateLocalDeliveryStatus(id!, status);

      if (connected) {
        try {
          await updateDeliveryStatus(id!, status, payload);
          await syncOfflineQueue();
        } catch (err) {
          await enqueueSyncItem('STATUS_UPDATE', { deliveryId: id, ...payload });
          const msg = err instanceof Error ? err.message : 'Guardado localmente; se sincronizará al reconectar';
          Alert.alert('Sin conexión al servidor', msg);
        }
      } else {
        await enqueueSyncItem('STATUS_UPDATE', { deliveryId: id, ...payload });
      }

      notifyDeliveriesSync();
      await loadDelivery();

      const terminalStatuses = ['DELIVERED', 'PARTIALLY_DELIVERED', 'NOT_DELIVERED'];
      if (terminalStatuses.includes(status)) {
        const backTo =
          typeof returnTo === 'string' && returnTo.length > 0
            ? returnTo
            : '/(tabs)/deliveries';
        router.replace(backTo as never);
        return;
      }

      setSelectedIncident('');
      setIncidentNotes('');
      setDeliveryNotes('');
      Alert.alert('Éxito', `Estado actualizado: ${DELIVERY_STATUS_LABELS[status] || status}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setLoading(false);
    }
  };

  const reportIncident = async (type: string, notes?: string) => {
    await sendIncident(type, notes);
    setIncidentPickerOpen(false);
    setSelectedIncident('');
    setIncidentNotes('');
    Alert.alert('Incidencia', 'Reporte registrado correctamente');
  };

  const submitIncident = () => {
    if (!selectedIncident) {
      Alert.alert('Validación', 'Seleccione un tipo de incidencia');
      return;
    }
    reportIncident(selectedIncident, incidentNotes);
  };

  if (loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={loadDelivery}>
          <Text style={styles.actionText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!delivery) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const statusLocked = isDeliveryCompleted(delivery.status);

  return (
    <ScrollView style={styles.container}>
      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Modo sin conexión: los cambios se guardan en el dispositivo y se sincronizan al reconectar.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.deliveryNumber}>{delivery.deliveryNumber}</Text>
        <Text style={styles.patient}>
          {delivery.patient.firstName} {delivery.patient.lastName}
        </Text>
        <Text style={styles.detail}>Documento: {delivery.patient.documentId}</Text>
        <Text style={styles.detail}>Teléfono: {delivery.patient.phone || '—'}</Text>
        <Text style={styles.address}>{delivery.patient.address}</Text>
        <Text style={styles.status}>
          Estado: {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status}
        </Text>
        <Text style={styles.detail}>
          Prioridad: {PRIORITY_LABELS[delivery.priority] || delivery.priority}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medicamentos</Text>
        {delivery.items.map((item) => (
          <Text key={item.id} style={styles.item}>
            • {item.medication.name} x{item.quantity}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubicación GPS</Text>
        {gps ? (
          <Text style={styles.detail}>
            {gps.lat.toFixed(6)}, {gps.lng.toFixed(6)} (±{gps.accuracy.toFixed(0)} m)
          </Text>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={captureGps}>
            <Text style={styles.actionText}>Capturar GPS</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Evidencia fotográfica ({photos.length}/{MAX_PHOTOS})</Text>
        <Text style={styles.hint}>
          Las fotos cargadas previamente se muestran aquí. Sin internet quedan guardadas localmente.
        </Text>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto} disabled={statusLocked}>
          <Text style={[styles.actionText, statusLocked && styles.disabledText]}>Tomar fotografía</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickFromGallery} disabled={statusLocked}>
          <Text style={[styles.actionText, statusLocked && styles.disabledText]}>Seleccionar de galería</Text>
        </TouchableOpacity>
        {photos.map((photo) => (
          <View key={photo.key}>
            <EvidenceImage photo={photo} />
            {photo.pendingSync ? (
              <Text style={styles.pendingSync}>Pendiente de sincronizar</Text>
            ) : null}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cambiar estado</Text>
        {statusLocked ? (
          <Text style={styles.lockedBanner}>
            Esta entrega ya fue completada. No puede modificar el estado.
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.notesInput}
              placeholder="Comentarios de la entrega (ej: recibe la hermana)"
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              multiline
            />
            {loading ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#6366f1' }]}
                  onPress={() => changeStatus('IN_ROUTE')}
                >
                  <Text style={styles.statusBtnText}>En ruta</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#22c55e' }]}
                  onPress={() => changeStatus('DELIVERED')}
                >
                  <Text style={styles.statusBtnText}>Entregado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#f59e0b' }]}
                  onPress={() => changeStatus('PARTIALLY_DELIVERED')}
                >
                  <Text style={styles.statusBtnText}>Entregado parcial</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusBtn, { backgroundColor: '#ef4444' }]}
                  onPress={() => changeStatus('NOT_DELIVERED')}
                >
                  <Text style={styles.statusBtnText}>No entregado</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>

      {!statusLocked && (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Incidencia (opcional)</Text>
        <Text style={styles.hint}>
          Ej: paciente ausente. Regístrela antes de cerrar la entrega.
        </Text>
        <TouchableOpacity
          style={styles.dropdownBtn}
          onPress={() => setIncidentPickerOpen(true)}
        >
          <Text style={styles.dropdownBtnText}>
            {selectedIncident
              ? INCIDENT_LABELS[selectedIncident]
              : 'Seleccionar tipo de incidencia'}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={styles.notesInput}
          placeholder="Comentarios de la incidencia (ej: recibe la hermana)"
          value={incidentNotes}
          onChangeText={setIncidentNotes}
          multiline
        />
        <TouchableOpacity
          style={[styles.statusBtn, { backgroundColor: '#dc2626' }]}
          onPress={submitIncident}
        >
          <Text style={styles.statusBtnText}>Enviar incidencia</Text>
        </TouchableOpacity>
      </View>
      )}

      <Modal visible={incidentPickerOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setIncidentPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Tipo de incidencia</Text>
            {Object.entries(INCIDENT_LABELS).map(([type, label]) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.incidentOption,
                  selectedIncident === type && styles.incidentOptionSelected,
                ]}
                onPress={() => {
                  setSelectedIncident(type);
                  setIncidentPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.incidentOptionText,
                    selectedIncident === type && styles.incidentOptionTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setIncidentPickerOpen(false)}
            >
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    padding: 12,
    margin: 12,
    marginBottom: 0,
    borderRadius: 8,
  },
  offlineText: { fontSize: 13, color: '#92400e' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  section: { backgroundColor: '#fff', margin: 12, padding: 16, borderRadius: 12 },
  deliveryNumber: { fontSize: 18, fontWeight: 'bold', color: '#2563eb' },
  patient: { fontSize: 20, fontWeight: '600', marginTop: 8 },
  detail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  address: { fontSize: 14, marginTop: 8 },
  status: { fontSize: 14, fontWeight: '600', marginTop: 8, color: '#334155' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 10 },
  lockedBanner: {
    fontSize: 14,
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
  },
  disabledText: { color: '#94a3b8' },
  item: { fontSize: 14, marginBottom: 4 },
  actionBtn: { backgroundColor: '#e0e7ff', padding: 12, borderRadius: 8, marginBottom: 8 },
  actionText: { color: '#2563eb', fontWeight: '600', textAlign: 'center' },
  preview: { width: '100%', height: 150, borderRadius: 8, marginTop: 8 },
  pendingSync: { fontSize: 11, color: '#d97706', marginTop: 4, fontWeight: '600' },
  statusBtn: { padding: 14, borderRadius: 8, marginBottom: 8 },
  statusBtnText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  dropdownBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dropdownBtnText: { color: '#334155', fontSize: 14 },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    minHeight: 72,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  incidentOption: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  incidentOptionSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  incidentOptionText: { fontSize: 14, color: '#334155' },
  incidentOptionTextSelected: { color: '#2563eb', fontWeight: '600' },
  modalCloseBtn: { padding: 14, alignItems: 'center', marginTop: 8 },
  modalCloseText: { color: '#64748b', fontWeight: '600' },
});
