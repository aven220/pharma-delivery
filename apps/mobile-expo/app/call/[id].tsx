import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  fetchMyCalls,
  getApiErrorMessage,
  registerCallDial,
  updateMyCall,
  type MobileCallAssignment,
} from '../../services/api';
import {
  CALL_MANAGEMENT_LABELS,
  CALL_QUEUE_STATUS_LABELS,
} from '../../constants/labels';

const STATUS_OPTIONS = Object.entries(CALL_QUEUE_STATUS_LABELS);
const RESULT_OPTIONS = Object.entries(CALL_MANAGEMENT_LABELS);

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
  const [hasDialed, setHasDialed] = useState(false);
  const [dialStartedAt, setDialStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

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
        setHasDialed(!!(found.dialClickedAt || (found.dialClickCount ?? 0) > 0));
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

  const handleDial = async (phone: string) => {
    if (!call) return;
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      // Algunos dispositivos fallan Linking; igual registramos el intento
    }
    try {
      await registerCallDial(call.id, phone);
      setHasDialed(true);
      setPhoneUsed(phone);
      setDialStartedAt(Date.now());
      setElapsedSec(0);
    } catch (err) {
      Alert.alert('Error', getApiErrorMessage(err, 'No se pudo registrar la marcación.'));
    }
  };

  const handleSave = async () => {
    if (!call) return;
    if (!hasDialed && skipDialJustification.trim().length < 10) {
      Alert.alert(
        'Marque o justifique',
        'Pulse Llamar ahora, o escriba una justificación de al menos 10 caracteres.'
      );
      return;
    }
    if (!managementResult && status === 'PENDING') {
      Alert.alert('Resultado', 'Seleccione un resultado de gestión o estado de llamada.');
      return;
    }
    setSaving(true);
    try {
      await updateMyCall(call.id, {
        status,
        managementResult: managementResult || undefined,
        observations: observations || undefined,
        phoneUsed: phoneUsed || undefined,
        durationSec: elapsedSec || call.durationSec || undefined,
        callDate: new Date().toISOString().slice(0, 10),
        callTime: new Date().toTimeString().slice(0, 5),
        skipDialJustification: !hasDialed ? skipDialJustification.trim() : undefined,
        action: managementResult === 'CONFIRMED_FOR_DELIVERY' ? 'CONFIRM' : undefined,
      });
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
      <Text style={styles.step}>Paso 1 — Paciente / entrega</Text>
      <View style={styles.card}>
        <Text style={styles.name}>{patientName || 'Paciente'}</Text>
        <Text style={styles.meta}>Doc. {call.delivery?.patient?.documentId ?? '—'}</Text>
        <Text style={styles.meta}>Entrega {call.delivery?.deliveryNumber ?? '—'}</Text>
        <Text style={styles.meta}>{call.delivery?.patient?.address ?? ''}</Text>
        {(call.delivery?.items?.length ?? 0) > 0 && (
          <View style={styles.meds}>
            <Text style={styles.medsTitle}>Medicamentos</Text>
            {call.delivery!.items!.map((item) => (
              <Text key={item.id} style={styles.meta}>
                · {item.medication?.name ?? 'Medicamento'} × {item.quantity}
              </Text>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.step}>Paso 2 — Llamar</Text>
      <View style={styles.card}>
        {hasDialed ? (
          <Text style={styles.ok}>
            Marcación registrada
            {elapsedSec > 0 ? ` · ${elapsedSec}s` : ''}
          </Text>
        ) : (
          <Text style={styles.warn}>Pulse Llamar ahora antes de guardar.</Text>
        )}
        {phones.map((ph) => (
          <TouchableOpacity
            key={ph.label}
            style={styles.dialBtn}
            onPress={() => void handleDial(ph.value)}
          >
            <Text style={styles.dialText}>
              Llamar ahora — {ph.label}: {ph.value}
            </Text>
          </TouchableOpacity>
        ))}
        {phones.length === 0 && (
          <Text style={styles.meta}>Sin teléfonos. Escríbalo abajo.</Text>
        )}
      </View>

      <Text style={styles.step}>Paso 3 — Resultado</Text>
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

        <Text style={styles.label}>Teléfono usado</Text>
        <TextInput
          style={styles.input}
          value={phoneUsed}
          onChangeText={setPhoneUsed}
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Observaciones</Text>
        <TextInput
          style={[styles.input, styles.area]}
          value={observations}
          onChangeText={setObservations}
          multiline
        />

        {!hasDialed && (
          <>
            <Text style={styles.label}>Justificación si no pudo marcar (mín. 10)</Text>
            <TextInput
              style={[styles.input, styles.area]}
              value={skipDialJustification}
              onChangeText={setSkipDialJustification}
              multiline
              placeholder="Ej: número inválido en la base..."
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
          <Text style={styles.saveText}>Paso 4 — Guardar</Text>
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
  meds: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  medsTitle: { fontWeight: '600', color: '#2563eb', marginBottom: 4 },
  ok: { color: '#15803d', fontWeight: '600', marginBottom: 10 },
  warn: { color: '#b45309', fontWeight: '600', marginBottom: 10 },
  dialBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  dialText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
