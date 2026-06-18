import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getLocalDeliveries, getPendingSyncCount } from '../../database/deliveries.repo';
import { fetchAndCacheDeliveries, getSyncStatus, isOnline, performFullSync } from '../../sync/syncManager';
import { onDeliveriesSync } from '../../sync/syncEvents';
import { useAuthStore } from '../../store/auth.store';
import { OFFLINE_WORKING_MSG } from '../../lib/user-messages';
import { DELIVERY_STATUS_LABELS, PRIORITY_LABELS } from '../../constants/labels';
import { filterDeliveryDtos, isDeliveryCompleted } from '../../lib/deliveryListUtils';
import { SearchBar } from '../../components/SearchBar';
import type { DeliveryDTO } from '@pharma/types';

const statusColors: Record<string, string> = {
  CONFIRMED_FOR_DELIVERY: '#8b5cf6',
  ASSIGNED: '#3b82f6',
  IN_ROUTE: '#6366f1',
  DELIVERED: '#22c55e',
  PARTIALLY_DELIVERED: '#84cc16',
  NOT_DELIVERED: '#ef4444',
  FAILED: '#ef4444',
};

export default function DeliveriesScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [deliveries, setDeliveries] = useState<DeliveryDTO[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncCount, setSyncCount] = useState(0);
  const [search, setSearch] = useState('');

  const visibleDeliveries = useMemo(
    () => filterDeliveryDtos(deliveries, search),
    [deliveries, search]
  );

  const loadData = useCallback(async () => {
    const [local, pending, network] = await Promise.all([
      getLocalDeliveries(undefined, userId),
      getPendingSyncCount(),
      isOnline(),
    ]);
    const sync = getSyncStatus();
    setDeliveries(local);
    setPendingSync(pending);
    setOnline(network);
    setSyncError(sync.error);
    setSyncCount(sync.count);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    return onDeliveriesSync(() => {
      loadData();
    });
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (await isOnline()) await fetchAndCacheDeliveries();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const onForceSync = async () => {
    setRefreshing(true);
    try {
      await performFullSync();
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: DeliveryDTO }) => {
    const completed = isDeliveryCompleted(item.status);
    return (
    <TouchableOpacity
      style={[styles.card, completed && styles.cardCompleted]}
      onPress={() => router.push(`/delivery/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.deliveryNumber}>
          #{item.assignment?.routeOrder != null ? item.assignment.routeOrder + 1 : '—'} · {item.deliveryNumber}
        </Text>
        <View style={[styles.badge, { backgroundColor: statusColors[item.status] || '#94a3b8' }]}>
          <Text style={styles.badgeText}>
            {DELIVERY_STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.patientName}>
        {item.patient.firstName} {item.patient.lastName}
      </Text>
      <Text style={styles.address}>{item.patient.address}</Text>
      <View style={styles.footer}>
        <Text style={styles.priority}>{PRIORITY_LABELS[item.priority] || item.priority}</Text>
        <Text style={styles.items}>{item.items.length} medicamento(s)</Text>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entregas asignadas</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: online ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{online ? 'En línea' : 'Sin conexión'}</Text>
          {syncCount > 0 && (
            <Text style={styles.syncOk}>{syncCount} entrega(s) sincronizada(s)</Text>
          )}
          {pendingSync > 0 && (
            <Text style={styles.syncBadge}>{pendingSync} pendiente(s) de envío</Text>
          )}
        </View>
        {!online && (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineText}>{OFFLINE_WORKING_MSG}</Text>
          </View>
        )}
        {syncError && online ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{syncError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onForceSync}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar entrega, paciente, documento o dirección..."
        />
      </View>

      <FlatList
        data={visibleDeliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {search.trim() ? 'Sin resultados para la búsqueda' : 'No hay entregas asignadas'}
          </Text>
        }
        contentContainerStyle={visibleDeliveries.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, color: '#64748b' },
  syncBadge: { fontSize: 12, color: '#f59e0b', fontWeight: '600' },
  syncOk: { fontSize: 12, color: '#16a34a', fontWeight: '600' },
  offlineBox: { marginTop: 10, padding: 10, backgroundColor: '#fffbeb', borderRadius: 8 },
  offlineText: { fontSize: 13, color: '#92400e' },
  errorBox: { marginTop: 10, padding: 10, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { fontSize: 13, color: '#dc2626' },
  retryBtn: { marginTop: 8, padding: 8, backgroundColor: '#2563eb', borderRadius: 6 },
  retryText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 13 },
  card: { backgroundColor: '#fff', margin: 12, marginBottom: 0, padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardCompleted: { opacity: 0.72, borderWidth: 1, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deliveryNumber: { fontSize: 16, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  patientName: { fontSize: 18, fontWeight: '500', marginTop: 8 },
  address: { fontSize: 14, color: '#64748b', marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  priority: { fontSize: 12, fontWeight: '600', color: '#2563eb' },
  items: { fontSize: 12, color: '#94a3b8' },
  empty: { textAlign: 'center', color: '#94a3b8', fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
});
