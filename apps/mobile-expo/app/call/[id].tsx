import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Linking,
  Alert,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import {
  fetchDeliveryEvidence,
  fetchMyCalls,
  getApiErrorMessage,
  registerCallDial,
  updateMyCall,
  uploadEvidence,
  type MobileCallAssignment,
} from '../../services/api';
import {
  CALL_MANAGEMENT_LABELS,
  CALL_QUEUE_STATUS_LABELS,
} from '../../constants/labels';

const STATUS_OPTIONS = Object.entries(CALL_QUEUE_STATUS_LABELS);
const RESULT_OPTIONS = Object.entries(CALL_MANAGEMENT_LABELS);

function digitsOnly(phone: string) {
  return phone.replace(/\D/g, '');
}

/** Colombia: si empieza en 3 y tiene 10 dígitos, antepone 57. */
function toWhatsAppNumber(phone: string) {
  let d = digitsOnly(phone);
  if (d.startsWith('57') && d.length >= 12) return d;
  if (d.length === 10 && d.startsWith('3')) return `57${d}`;
  if (d.length === 7) return `57${d}`;
  return d;
}

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [call, setCall] = useState<MobileCallAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('PENDING');
  const [managementResult, setManagementResult] = useState('');
  const [observations, setObservations] = useState('');
  const [skipDialJustification, setSkipDialJustification] = useState('');
  const [phoneUsed, setPhoneUsed] = useState('');
  const [hasContacted, setHasContacted] = useState(false);
  const [contactChannel, setContactChannel] = useState<'CALL' | 'WHATSAPP' | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState(false);
  const [dialStartedAt, setDialStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const leftForContact = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchMyCalls(100);
      const found = list.find((c) => c.id === id) || null;
      setCall(found);
      if (found) {
        setStatus(found.status || 'PENDING');
        setManagementResult(found.managementResult || '');
        setObservations(found.observations || '');
        setPhoneUsed(found.phoneUsed || found.delivery?.patient?.phone || '');
        setHasContacted(!!(found.dialClickedAt || (found.dialClickCount ?? 0) > 0));
        try {
          const ev = await fetchDeliveryEvidence(found.delivery.id);
          setEvidenceCount(ev.length);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo cargar la llamada.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialStartedAt) return;
    const t = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - dialStartedAt) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [dialStartedAt]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active' && leftForContact.current) {
        leftForContact.current = false;
        setAwaitingReturn(true);
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  const phones = useMemo(() => {
    if (!call?.delivery?.patient) return [] as Array<{ label: string; value: string }>;
    const p = call.delivery.patient;
    return [
      { label: 'Principal', value: p.phone || '' },
      { label: 'Secundario', value: p.phoneAlt || '' },
      { label: 'Familiar', value: p.phoneFamily || '' },
      { label: 'Alternativo', value: p.phoneAlternative || '' },
    ].filter((x) => x.value);
  }, [call]);

  const patientName = (() => {
    const p = call?.delivery?.patient;
    if (!p) return '';
    return p.lastName === '.'
      ? p.firstName
      : `${p.firstName || ''} ${p.lastName || ''}`.trim();
  })();

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Micrófono', 'Permita el micrófono para grabar la nota de la llamada.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setRecording(true);
    } catch {
      Alert.alert('Grabación', 'No se pudo iniciar la grabación. Continúe con capturas si escribe por WhatsApp.');
    }
  };

  const stopRecordingAndUpload = async () => {
    const rec = recordingRef.current;
    if (!rec || !call) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recordingRef.current = null;
      setRecording(false);
      if (!uri) return;
      setUploading(true);
      await uploadEvidence(call.delivery.id, 'DOCUMENT', uri, undefined, undefined, {
        mimeType: 'audio/m4a',
        fileName: `llamada-${Date.now()}.m4a`,
      });
      setEvidenceCount((n) => n + 1);
      setObservations((o) =>
        o.includes('[Audio]') ? o : `${o ? `${o}\n` : ''}[Audio] Nota de voz de la gestión`
      );
      Alert.alert('Audio guardado', 'La nota de voz se subió como evidencia.');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo guardar el audio.'));
    } finally {
      setUploading(false);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    }
  };

  const markContacted = async (phone: string, channel: 'CALL' | 'WHATSAPP') => {
    if (!call) return;
    try {
      await registerCallDial(call.id, phone);
      setHasContacted(true);
      setPhoneUsed(phone);
      setContactChannel(channel);
      setDialStartedAt(Date.now());
      setElapsedSec(0);
      leftForContact.current = true;
      setAwaitingReturn(false);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo registrar el contacto.'));
    }
  };

  const handleCall = async () => {
    const phone = phoneUsed.trim();
    if (!phone) {
      Alert.alert('Teléfono', 'Escriba o elija un número antes de llamar.');
      return;
    }
    await markContacted(phone, 'CALL');
    void startRecording();
    try {
      await Linking.openURL(`tel:${digitsOnly(phone)}`);
    } catch {
      /* registrar igual */
    }
  };

  const handleWhatsApp = async () => {
    const phone = phoneUsed.trim();
    if (!phone) {
      Alert.alert('Teléfono', 'Escriba o elija un número antes de abrir WhatsApp.');
      return;
    }
    const wa = toWhatsAppNumber(phone);
    if (wa.length < 10) {
      Alert.alert('WhatsApp', 'El número no parece válido. Corríjalo y reintente.');
      return;
    }
    await markContacted(phone, 'WHATSAPP');
    const url = `https://wa.me/${wa}`;
    try {
      const can = await Linking.canOpenURL(url);
      if (!can) {
        Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp. Verifique que esté instalado.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp.');
    }
  };

  const handleHungUpContinue = async () => {
    setAwaitingReturn(false);
    if (recording) {
      await stopRecordingAndUpload();
    }
    Alert.alert(
      'Continúe la gestión',
      'Seleccione el resultado, agregue capturas de WhatsApp si escribió y guarde.'
    );
  };

  const pickEvidence = async (fromCamera: boolean) => {
    if (!call) return;
    if (fromCamera) {
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Cámara', 'Se necesita permiso de cámara.');
        return;
      }
    } else {
      const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!lib.granted) {
        Alert.alert('Galería', 'Se necesita permiso de galería.');
        return;
      }
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          mediaTypes: ['images'],
        });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploading(true);
    try {
      await uploadEvidence(call.delivery.id, 'PHOTO', result.assets[0].uri);
      setEvidenceCount((n) => n + 1);
      setObservations((o) =>
        o.includes('[WhatsApp]') || o.includes('[Captura]')
          ? o
          : `${o ? `${o}\n` : ''}[Captura] Evidencia de gestión (WhatsApp / pantalla)`
      );
      setHasContacted(true);
      Alert.alert('Evidencia', 'Captura guardada en el servidor.');
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo subir la captura.'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!call) return;
    if (!hasContacted && skipDialJustification.trim().length < 10) {
      Alert.alert(
        'Contacte o justifique',
        'Llame, abra WhatsApp, o escriba una justificación de al menos 10 caracteres.'
      );
      return;
    }
    if (!managementResult && status === 'PENDING') {
      Alert.alert('Resultado', 'Seleccione un resultado de gestión o estado.');
      return;
    }
    if (recording) {
      await stopRecordingAndUpload();
    }
    setSaving(true);
    try {
      const tomorrow = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();

      const channelNote =
        contactChannel === 'WHATSAPP'
          ? '[Canal: WhatsApp]'
          : contactChannel === 'CALL'
            ? '[Canal: Llamada]'
            : '';
      const obs = [observations, channelNote].filter(Boolean).join('\n');

      const payload: Record<string, unknown> = {
        status,
        managementResult: managementResult || undefined,
        observations: obs || undefined,
        phoneUsed: phoneUsed || undefined,
        durationSec: elapsedSec || call.durationSec || undefined,
        callDate: new Date().toISOString().slice(0, 10),
        callTime: new Date().toTimeString().slice(0, 5),
        skipDialJustification: !hasContacted ? skipDialJustification.trim() : undefined,
      };

      if (managementResult === 'CONFIRMED_FOR_DELIVERY' || status === 'CONFIRMED') {
        payload.action = 'CONFIRM';
        payload.status = 'CONFIRMED';
      } else if (managementResult === 'SERVICE_REJECTED') {
        payload.action = 'DEACTIVATE';
        payload.deactivationReason = 'TREATMENT_REJECTED';
      } else if (
        managementResult === 'NOT_LOCATED' ||
        managementResult === 'RESCHEDULE' ||
        status === 'NO_ANSWER' ||
        status === 'OFF' ||
        status === 'RESCHEDULE'
      ) {
        payload.action = 'RESCHEDULE';
        payload.rescheduleDate = tomorrow;
        payload.status = status === 'PENDING' ? 'NO_ANSWER' : status;
      }

      await updateMyCall(call.id, payload);
      Alert.alert('Listo', 'Gestión guardada.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/calls') },
      ]);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo guardar.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Llamada no encontrada.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Paso 1 — Paciente</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{patientName || 'Paciente'}</Text>
        <Text style={styles.meta}>Doc. {call.delivery?.patient?.documentId ?? '—'}</Text>
        <Text style={styles.meta}>Entrega {call.delivery?.deliveryNumber ?? '—'}</Text>
        <Text style={styles.meta}>{call.delivery?.patient?.address ?? ''}</Text>
      </View>

      <Text style={styles.step}>Paso 2 — Contactar (llamar o WhatsApp)</Text>
      <View style={styles.card}>
        {hasContacted ? (
          <Text style={styles.ok}>
            Contacto registrado
            {contactChannel === 'WHATSAPP' ? ' · WhatsApp' : contactChannel === 'CALL' ? ' · Llamada' : ''}
            {elapsedSec > 0 ? ` · ${elapsedSec}s` : ''}
            {recording ? ' · Grabando…' : ''}
          </Text>
        ) : (
          <Text style={styles.warn}>Edite el número si hace falta, luego Llame o escriba por WhatsApp.</Text>
        )}

        <Text style={styles.label}>Número (editable)</Text>
        <TextInput
          style={styles.input}
          value={phoneUsed}
          onChangeText={setPhoneUsed}
          keyboardType="phone-pad"
          placeholder="Ej: 3001234567"
          placeholderTextColor="#94a3b8"
        />

        {phones.length > 0 && (
          <View style={styles.phoneChips}>
            {phones.map((ph) => (
              <TouchableOpacity
                key={ph.label}
                style={styles.phoneChip}
                onPress={() => setPhoneUsed(ph.value)}
              >
                <Text style={styles.phoneChipText}>
                  {ph.label}: {ph.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.dialBtn} onPress={() => void handleCall()}>
          <Text style={styles.dialText}>Llamar ahora</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={() => void handleWhatsApp()}>
          <Text style={styles.dialText}>Escribir por WhatsApp</Text>
        </TouchableOpacity>

        {awaitingReturn && (
          <TouchableOpacity style={styles.continueBtn} onPress={() => void handleHungUpContinue()}>
            <Text style={styles.dialText}>Ya colgué / volví — Continuar gestión</Text>
          </TouchableOpacity>
        )}

        {recording && (
          <TouchableOpacity style={styles.stopRecBtn} onPress={() => void stopRecordingAndUpload()}>
            <Text style={styles.dialText}>Detener grabación y guardar audio</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.step}>Paso 3 — Evidencias (capturas WhatsApp)</Text>
      <View style={styles.card}>
        <Text style={styles.meta}>
          Si escribió por WhatsApp, tome captura del chat y súbala. Evidencias: {evidenceCount}
        </Text>
        <TouchableOpacity
          style={[styles.evidenceBtn, uploading && { opacity: 0.6 }]}
          disabled={uploading}
          onPress={() => void pickEvidence(false)}
        >
          <Text style={styles.evidenceBtnText}>
            {uploading ? 'Subiendo…' : 'Subir captura de galería'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.evidenceBtnOutline, uploading && { opacity: 0.6 }]}
          disabled={uploading}
          onPress={() => void pickEvidence(true)}
        >
          <Text style={styles.evidenceBtnOutlineText}>Tomar foto ahora</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.step}>Paso 4 — Resultado</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Estado llamada</Text>
        <View style={styles.chips}>
          {STATUS_OPTIONS.map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, status === value && styles.chipOn]}
              onPress={() => setStatus(value)}
            >
              <Text style={[styles.chipText, status === value && styles.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Resultado gestión</Text>
        <View style={styles.chips}>
          {RESULT_OPTIONS.map(([value, label]) => (
            <TouchableOpacity
              key={value}
              style={[styles.chip, managementResult === value && styles.chipOn]}
              onPress={() => setManagementResult(value)}
            >
              <Text style={[styles.chipText, managementResult === value && styles.chipTextOn]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Observaciones</Text>
        <TextInput
          style={[styles.input, styles.area]}
          value={observations}
          onChangeText={setObservations}
          multiline
        />

        {!hasContacted && (
          <>
            <Text style={styles.label}>Justificación si no pudo contactar (mín. 10)</Text>
            <TextInput
              style={[styles.input, styles.area]}
              value={skipDialJustification}
              onChangeText={setSkipDialJustification}
              multiline
              placeholder="Ej: número inválido..."
              placeholderTextColor="#94a3b8"
            />
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, saving && { opacity: 0.7 }]}
        disabled={saving}
        onPress={() => void handleSave()}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>Paso 5 — Guardar</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  empty: { color: '#64748b', fontSize: 16 },
  link: { color: '#2563eb', marginTop: 12, fontWeight: '600' },
  step: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 8, marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  ok: { color: '#15803d', fontWeight: '600', marginBottom: 10 },
  warn: { color: '#b45309', fontWeight: '600', marginBottom: 10 },
  phoneChips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  phoneChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  phoneChipText: { fontSize: 12, color: '#334155' },
  dialBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  waBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  continueBtn: {
    backgroundColor: '#b45309',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  stopRecBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  dialText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  evidenceBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  evidenceBtnText: { color: '#fff', fontWeight: '700' },
  evidenceBtnOutline: {
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  evidenceBtnOutlineText: { color: '#0f172a', fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  chip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, color: '#334155' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  area: { minHeight: 80, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
