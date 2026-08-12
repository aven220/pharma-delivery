import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { fetchMyCalls, getApiErrorMessage, type MobileCallAssignment } from '../../services/api';
import { CALL_QUEUE_STATUS_LABELS } from '../../constants/labels';

function patientName(c: MobileCallAssignment) {
  const p = c?.delivery?.patient;
  if (!p) return 'Paciente';
  return p.lastName === '.' ? p.firstName : `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Paciente';
}

export default function CallsScreen() {
  const router = useRouter();
  const [calls, setCalls] = useState<MobileCallAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const silent = useRef(false);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setError('');
    try {
      const data = await fetchMyCalls(100);
      setCalls(data);
      setUpdatedAt(new Date());
    } catch (err) {
      if (!opts?.soft) {
        setError(getApiErrorMessage(err, 'No se pudieron cargar las llamadas.', 'sync'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
      const t = setInterval(() => {
        silent.current = true;
        void load({ soft: true });
      }, 15000);
      return () => clearInterval(t);
    }, [load])
  );

  const pending = useMemo(
    () => calls.filter((c) => !c.managementResult && c.status === 'PENDING'),
    [calls]
  );
  const others = useMemo(
    () => calls.filter((c) => !(!c.managementResult && c.status === 'PENDING')),
    [calls]
  );
  const list = [...pending, ...others];

  if (loading && calls.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis llamadas</Text>
        <Text style={styles.subtitle}>
          Se actualiza sola cada 15 s · Deslice para refrescar
        </Text>
        {updatedAt ? (
          <Text style={styles.updated}>
            Actualizado {updatedAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No tiene llamadas asignadas.</Text>}
        renderItem={({ item }) => {
          const phones = [item.delivery?.patient?.phone, item.delivery?.patient?.phoneAlt].filter(
            Boolean
          );
          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/call/${item.id}`)}>
              <Text style={styles.name}>{patientName(item)}</Text>
              <Text style={styles.meta}>
                Entrega {item.delivery?.deliveryNumber ?? '—'}
                {item.delivery?.documentNumber ? ` · Doc. ${item.delivery.documentNumber}` : ''}
              </Text>
              <Text style={styles.meta}>
                {CALL_QUEUE_STATUS_LABELS[item.status] || item.status}
                {item.dialClickedAt ? ' · Marcó' : ''}
              </Text>
              {phones[0] ? <Text style={styles.phone}>{phones[0]}</Text> : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  updated: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  error: { color: '#dc2626', marginTop: 8, fontSize: 13 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 48, fontSize: 16 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  name: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  phone: { fontSize: 15, color: '#2563eb', marginTop: 8, fontWeight: '600' },
});
