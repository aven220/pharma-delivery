import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { closeIntermunicipalRoute, fetchIntermunicipalRoute, getApiErrorMessage } from '../../services/api';
import { upsertDeliveries } from '../../database/deliveries.repo';
import { mapRouteDeliveriesToDto } from '../../lib/routeDeliveryMapper';
import {
  filterRouteDeliveryItems,
  isDeliveryCompleted,
  sortRouteDeliveryItems,
} from '../../lib/deliveryListUtils';
import { SearchBar } from '../../components/SearchBar';
import { DELIVERY_STATUS_LABELS } from '../../constants/labels';

const ROUTE_STATUS_LABELS: Record<string, string> = {
  PREPARATION: 'Preparación',
  READY_FOR_DISPATCH: 'Lista despacho',
  DISPATCHED: 'Despachada',
  IN_ROUTE: 'En ruta',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

const ACTIVE_ROUTE_STATUSES = ['DISPATCHED', 'IN_ROUTE'];

type RouteDeliveryRow = {
  id: string;
  stopOrder: number;
  delivery: {
    id: string;
    deliveryNumber: string;
    status: string;
    patient: {
      firstName: string;
      lastName: string;
      documentId: string;
      phone?: string;
      address: string;
    };
    items: Array<{ quantity: number; medication: { name: string } }>;
  };
};

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [route, setRoute] = useState<Record<string, unknown> | null>(null);
  const [search, setSearch] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  const loadRoute = useCallback(async () => {
    if (!id) return;
    const data = await fetchIntermunicipalRoute(id);
    setRoute(data);

    const items = (data.deliveries as Array<Record<string, unknown>>) || [];
    if (items.length > 0) {
      await upsertDeliveries(mapRouteDeliveriesToDto(items as never));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadRoute();
    }, [loadRoute])
  );

  const deliveries = useMemo(() => {
    const raw = ((route?.deliveries as RouteDeliveryRow[]) || []);
    const sorted = sortRouteDeliveryItems(raw);
    return filterRouteDeliveryItems(sorted, search);
  }, [route, search]);

  const pendingCount = useMemo(() => {
    const raw = (route?.deliveries as RouteDeliveryRow[]) || [];
    return raw.filter((item) => !isDeliveryCompleted(item.delivery.status)).length;
  }, [route]);

  const routeStatus = String(route?.status || '');
  const routeClosed = ['COMPLETED', 'CANCELLED'].includes(routeStatus);
  const totalDeliveries = ((route?.deliveries as RouteDeliveryRow[]) || []).length;
  const canFinalizeRoute =
    !routeClosed &&
    ACTIVE_ROUTE_STATUSES.includes(routeStatus) &&
    totalDeliveries > 0 &&
    pendingCount === 0;

  const handleFinalizeRoute = () => {
    Alert.alert(
      'Finalizar ruta',
      '¿Confirma que registró el estado de todos los paquetes? Las entregas marcadas como no entregadas o parciales quedarán disponibles para nueva gestión de llamadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          style: 'default',
          onPress: async () => {
            if (!id) return;
            setClosing(true);
            try {
              await closeIntermunicipalRoute(id, closeNotes.trim() || undefined);
              Alert.alert('Ruta finalizada', 'La ruta se cerró correctamente.', [
                { text: 'OK', onPress: () => router.replace('/(tabs)/routes') },
              ]);
            } catch (err) {
              Alert.alert(
                'No se pudo finalizar',
                getApiErrorMessage(err, 'Intente de nuevo más tarde')
              );
            } finally {
              setClosing(false);
            }
          },
        },
      ]
    );
  };

  if (!route) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const stats = route.stats as Record<string, number>;
  const municipality = route.municipality as { name: string };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{String(route.routeCode)}</Text>
      <Text style={styles.subtitle}>{municipality?.name}</Text>
      <Text style={styles.meta}>
        Estado ruta: {ROUTE_STATUS_LABELS[routeStatus] || routeStatus}
      </Text>
      <Text style={styles.meta}>
        {stats?.totalDeliveries || 0} entregas · {stats?.totalPatients || 0} pacientes ·{' '}
        {stats?.totalMedications || 0} medicamentos
      </Text>
      <Text style={styles.meta}>
        Sin estado en campo: {pendingCount} · Completadas al final de la lista
      </Text>

      {routeClosed ? (
        <View style={styles.closedBanner}>
          <Text style={styles.closedBannerText}>
            Esta ruta ya fue {routeStatus === 'CANCELLED' ? 'cancelada' : 'finalizada'}.
          </Text>
        </View>
      ) : null}

      {!routeClosed && ACTIVE_ROUTE_STATUSES.includes(routeStatus) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cierre de ruta</Text>
          {pendingCount > 0 ? (
            <Text style={styles.hint}>
              Registre el estado de las {pendingCount} entrega(s) pendiente(s) antes de finalizar
              la ruta.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Todas las entregas tienen estado registrado. Las marcadas como no entregadas o
              parciales podrán volver a gestionarse por llamadas.
            </Text>
          )}
          <TextInput
            style={styles.notesInput}
            placeholder="Observaciones de cierre (opcional)"
            value={closeNotes}
            onChangeText={setCloseNotes}
            multiline
            editable={!closing}
          />
          <TouchableOpacity
            style={[styles.finalizeBtn, !canFinalizeRoute && styles.finalizeBtnDisabled]}
            onPress={handleFinalizeRoute}
            disabled={!canFinalizeRoute || closing}
          >
            {closing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.finalizeBtnText}>Finalizar ruta</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar en la ruta: paciente, documento, entrega..."
      />

      {deliveries.length === 0 ? (
        <Text style={styles.empty}>
          {search.trim() ? 'Sin resultados para la búsqueda' : 'Sin entregas en esta ruta'}
        </Text>
      ) : (
        deliveries.map((item) => {
          const delivery = item.delivery;
          const completed = isDeliveryCompleted(delivery.status);
          return (
            <TouchableOpacity
              key={String(item.id)}
              style={[styles.card, completed && styles.cardCompleted]}
              onPress={() =>
                router.push(
                  `/delivery/${delivery.id}?returnTo=${encodeURIComponent(`/route/${id}`)}`
                )
              }
            >
              <Text style={styles.deliveryNumber}>
                #{item.stopOrder + 1} · {delivery.deliveryNumber}
              </Text>
              <Text style={styles.patient}>
                {delivery.patient.firstName} {delivery.patient.lastName}
              </Text>
              <Text style={styles.detail}>Doc: {delivery.patient.documentId}</Text>
              <Text style={styles.detail}>Tel: {delivery.patient.phone || '—'}</Text>
              <Text style={styles.detail}>{delivery.patient.address}</Text>
              <Text style={styles.detail}>
                {delivery.items.map((i) => `${i.medication.name} x${i.quantity}`).join(', ')}
              </Text>
              <Text style={[styles.status, completed && styles.statusCompleted]}>
                {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: '#2563eb' },
  subtitle: { fontSize: 16, marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 4 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#334155' },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 18 },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 10,
    backgroundColor: '#f8fafc',
  },
  finalizeBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finalizeBtnDisabled: { backgroundColor: '#94a3b8' },
  finalizeBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closedBanner: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  closedBannerText: { color: '#15803d', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardCompleted: { opacity: 0.75, borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' },
  deliveryNumber: { fontWeight: '700', color: '#2563eb' },
  patient: { fontSize: 16, fontWeight: '600', marginTop: 6 },
  detail: { fontSize: 13, color: '#64748b', marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600', marginTop: 8 },
  statusCompleted: { color: '#15803d' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 24, fontSize: 15 },
});
