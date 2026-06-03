import { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyIntermunicipalRoutes } from '../../services/api';
import { filterByText } from '../../lib/deliveryListUtils';
import { SearchBar } from '../../components/SearchBar';

const STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

type RouteItem = {
  id: string;
  routeCode: string;
  status: string;
  municipality: { name: string };
  stats: { totalDeliveries: number; totalPatients: number };
};

export default function MyRoutesScreen() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadRoutes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyIntermunicipalRoutes();
      setRoutes(data || []);
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
    }, [loadRoutes])
  );

  const filteredRoutes = useMemo(
    () =>
      filterByText(routes, search, (r) =>
        [r.routeCode, r.municipality?.name, STATUS_LABELS[r.status] || r.status].join(' ')
      ),
    [routes, search]
  );

  const active = filteredRoutes.filter((r) =>
    ['DISPATCHED', 'IN_ROUTE', 'READY_FOR_DISPATCH', 'PREPARATION'].includes(r.status)
  );
  const finished = filteredRoutes.filter((r) => ['COMPLETED', 'CANCELLED'].includes(r.status));

  const renderSection = (title: string, items: RouteItem[], empty: string) => (
    <View style={styles.sectionBlock}>
      <Text style={styles.section}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>{empty}</Text>
      ) : (
        items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/route/${item.id}`)}
          >
            <Text style={styles.code}>{item.routeCode}</Text>
            <Text style={styles.meta}>{item.municipality?.name}</Text>
            <Text style={styles.meta}>
              {item.stats?.totalDeliveries || 0} entregas · {item.stats?.totalPatients || 0} pacientes
            </Text>
            <Text style={styles.status}>{STATUS_LABELS[item.status] || item.status}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRoutes} />}
    >
      <Text style={styles.title}>Mis Rutas</Text>
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar ruta, municipio o estado..."
      />
      {search.trim() && filteredRoutes.length === 0 ? (
        <Text style={styles.empty}>Sin rutas para la búsqueda</Text>
      ) : null}
      {renderSection('Activas / pendientes', active, 'No hay rutas activas')}
      {renderSection('Finalizadas', finished, 'No hay rutas finalizadas')}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  sectionBlock: { marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '600', marginVertical: 8, color: '#334155' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  code: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  status: { fontSize: 12, fontWeight: '600', marginTop: 8, color: '#0f766e' },
  empty: { color: '#94a3b8', marginBottom: 12 },
});
