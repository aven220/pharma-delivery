import { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { assignmentsApi, deliveriesApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import type { DeliveryDTO } from '@pharma/types';
import { Search, CheckCircle2 } from 'lucide-react';
import { ASSIGNMENT_STATUS_LABELS, DELIVERY_STATUS_LABELS, INTERMUNICIPAL_ROUTE_STATUS_LABELS, OPERATIONAL_TYPE_LABELS, ROUTE_STATUS_LABELS } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

interface CourierOption {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  zone: string | null;
  activeDeliveries: number;
  status: string;
  isAvailable: boolean;
  operationalType?: string;
  todayUrbanRoute?: {
    id: string;
    routeDate: string;
    status: string;
    totalStops: number;
    pendingStops: number;
    completedStops: number;
  } | null;
  activeIntermunicipalRoutes?: Array<{
    id: string;
    routeCode: string;
    routeDate: string;
    status: string;
    municipality: string;
    deliveryCount: number;
  }>;
}

function urbanRouteLabel(route: NonNullable<CourierOption['todayUrbanRoute']>): string {
  const date = new Date(route.routeDate).toISOString().slice(0, 10).replace(/-/g, '');
  return `RUTA-${date}-${route.id.slice(-4).toUpperCase()}`;
}

function matchCourier(courier: CourierOption, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = `${courier.firstName} ${courier.lastName} ${courier.zone || ''}`.toLowerCase();
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .every((part) => haystack.includes(part));
}

export function AssignmentsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');

  const { data: deliveries } = useQuery({
    queryKey: ['confirmed-deliveries'],
    queryFn: async () => {
      const res = await deliveriesApi.list({ status: 'CONFIRMED_FOR_DELIVERY', limit: 100 });
      return res.data.data as DeliveryDTO[];
    },
  });

  const {
    data: allCouriers,
    isLoading: loadingCouriers,
    isError: couriersError,
    refetch: refetchCouriers,
  } = useQuery({
    queryKey: ['assignment-couriers', zoneFilter],
    queryFn: async () => {
      const res = await assignmentsApi.listCouriers({ zone: zoneFilter || undefined });
      return res.data.data as CourierOption[];
    },
  });

  const couriers = useMemo(
    () => (allCouriers || []).filter((c) => matchCourier(c, search)),
    [allCouriers, search]
  );

  const { data: assignments, refetch } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const res = await assignmentsApi.list({ limit: 50 });
      return res.data.data;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const withdrawMutation = useMutation({
    mutationFn: (assignmentId: string) => assignmentsApi.withdraw(assignmentId),
    onSuccess: () => {
      refetch();
      toast.success('Asignación retirada');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo retirar la asignación')),
  });

  const assignMutation = useMutation({
    mutationFn: () => assignmentsApi.create({ deliveryIds: selectedIds, courierId: selectedCourierId }),
    onSuccess: () => {
      setSelectedIds([]);
      setSelectedCourierId('');
      refetch();
      refetchCouriers();
      toast.success('Entregas asignadas correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo asignar las entregas')),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const zones = [...new Set((allCouriers || []).map((c) => c.zone).filter(Boolean))] as string[];
  const selectedCourier = allCouriers?.find((c) => c.id === selectedCourierId);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Asignaciones</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>1. Entregas confirmadas ({selectedIds.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-2 overflow-auto">
              {(deliveries || []).map((d) => (
                <label key={d.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(d.id)}
                    onChange={() => toggleSelect(d.id)}
                  />
                  <div>
                    <div className="font-medium">{d.deliveryNumber}</div>
                    <div className="text-sm text-muted-foreground">
                      {d.patient.firstName} {d.patient.lastName}
                    </div>
                  </div>
                </label>
              ))}
              {(!deliveries || deliveries.length === 0) && (
                <p className="text-sm text-muted-foreground">No hay entregas confirmadas.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Seleccionar domiciliario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="courier-select">Domiciliario</Label>
              <Select
                id="courier-select"
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="mt-1 w-full"
                disabled={loadingCouriers || couriers.length === 0}
              >
                <option value="">
                  {loadingCouriers
                    ? 'Cargando domiciliarios...'
                    : `— Elija un domiciliario (${couriers.length} disponible(s)) —`}
                </option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                    {c.zone ? ` · ${c.zone}` : ''}
                    {` · ${c.activeDeliveries} entrega(s) activa(s)`}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Opcional: acortar lista..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} className="w-36">
                <option value="">Todas zonas</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </Select>
            </div>

            {couriersError && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                No se pudieron cargar los domiciliarios. Verifique permisos o recargue la página.
              </p>
            )}

            <div className="max-h-64 space-y-2 overflow-auto rounded-md border bg-muted/20 p-2">
              {loadingCouriers && (
                <p className="p-3 text-sm text-muted-foreground">Cargando lista...</p>
              )}
              {!loadingCouriers && couriers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourierId(c.id)}
                  className={`w-full rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-muted ${
                    selectedCourierId === c.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.firstName} {c.lastName}</span>
                    {selectedCourierId === c.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="text-muted-foreground">
                    Zona: {c.zone || 'Sin zona'} · Entregas activas: {c.activeDeliveries}
                  </div>
                  {c.operationalType && (
                    <div className="text-xs text-primary">
                      {OPERATIONAL_TYPE_LABELS[c.operationalType] || c.operationalType}
                    </div>
                  )}
                  {c.activeIntermunicipalRoutes && c.activeIntermunicipalRoutes.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ruta intermunicipal: {c.activeIntermunicipalRoutes[0].routeCode} ·{' '}
                      {c.activeIntermunicipalRoutes[0].municipality}
                    </div>
                  )}
                  {c.todayUrbanRoute && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ruta diaria: {urbanRouteLabel(c.todayUrbanRoute)} ·{' '}
                      {ROUTE_STATUS_LABELS[c.todayUrbanRoute.status] || c.todayUrbanRoute.status}
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    {c.isAvailable ? 'Disponible' : 'Ocupado'}
                  </div>
                </button>
              ))}
              {!loadingCouriers && couriers.length === 0 && !couriersError && (
                <p className="p-3 text-sm text-muted-foreground">
                  {search || zoneFilter
                    ? 'Ningún domiciliario coincide con el filtro. Limpie la búsqueda o la zona.'
                    : 'No hay domiciliarios activos. Créelos en Usuarios con rol Domiciliario.'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>3. Confirmar asignación</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {selectedCourier && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
              <p>
                Asignar <strong>{selectedIds.length}</strong> entrega(s) a{' '}
                <strong>{selectedCourier.firstName} {selectedCourier.lastName}</strong>
                {selectedCourier.operationalType && (
                  <> ({OPERATIONAL_TYPE_LABELS[selectedCourier.operationalType] || selectedCourier.operationalType})</>
                )}
              </p>

              {selectedCourier.activeIntermunicipalRoutes &&
                selectedCourier.activeIntermunicipalRoutes.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Ruta(s) intermunicipal(es) activa(s)</p>
                  {selectedCourier.activeIntermunicipalRoutes.map((route) => (
                    <div key={route.id} className="mt-1 rounded border bg-background p-2">
                      <p className="font-semibold">{route.routeCode}</p>
                      <p className="text-muted-foreground">
                        Municipio: {route.municipality} ·{' '}
                        {new Date(route.routeDate).toLocaleDateString('es-CO')}
                      </p>
                      <p className="text-muted-foreground">
                        Estado: {INTERMUNICIPAL_ROUTE_STATUS_LABELS[route.status] || route.status} ·{' '}
                        Entregas: {route.deliveryCount}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedCourier.todayUrbanRoute ? (
                <div className="rounded border bg-background p-2">
                  <p className="font-medium">Ruta diaria urbana</p>
                  <p className="font-semibold">{urbanRouteLabel(selectedCourier.todayUrbanRoute)}</p>
                  <p className="text-muted-foreground">
                    Estado: {ROUTE_STATUS_LABELS[selectedCourier.todayUrbanRoute.status] || selectedCourier.todayUrbanRoute.status} ·{' '}
                    Entregas en ruta: {selectedCourier.todayUrbanRoute.totalStops} ({selectedCourier.todayUrbanRoute.pendingStops} pendiente(s))
                  </p>
                </div>
              ) : (
                !selectedCourier.activeIntermunicipalRoutes?.length && (
                  <p className="text-muted-foreground">
                    Se creará una ruta diaria urbana al confirmar (primera asignación del día).
                  </p>
                )
              )}

              <p className="text-xs text-muted-foreground">
                Las nuevas entregas se suman a la ruta del día (no reemplazan las existentes).
              </p>
            </div>
          )}
          <Button
            disabled={!selectedCourierId || selectedIds.length === 0 || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Confirmar asignación
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Asignaciones recientes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {(assignments || []).map((a: {
              id: string;
              status: string;
              assignedAt: string;
              delivery: {
                deliveryNumber: string;
                status: string;
                patient: { firstName: string; lastName: string; city?: string | null };
                municipality?: { name: string } | null;
              };
              courier: { firstName: string; lastName: string };
              assignedBy?: { firstName: string; lastName: string };
            }) => (
              <div key={a.id} className="rounded-lg border bg-muted/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {a.delivery.patient.firstName} {a.delivery.patient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Entrega {a.delivery.deliveryNumber}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Municipio:</span>{' '}
                      {a.delivery.municipality?.name || a.delivery.patient.city || 'Sin municipio'}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Domiciliario:</span>{' '}
                      {a.courier.firstName} {a.courier.lastName}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Asignado:</span>{' '}
                      {new Date(a.assignedAt).toLocaleString('es-CO')}
                      {a.assignedBy
                        ? ` · por ${a.assignedBy.firstName} ${a.assignedBy.lastName}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {DELIVERY_STATUS_LABELS[a.delivery.status] || a.delivery.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ASSIGNMENT_STATUS_LABELS[a.status] || a.status}
                    </span>
                    {!['COMPLETED', 'CANCELLED'].includes(a.status) &&
                      !['DELIVERED', 'NOT_DELIVERED', 'CANCELLED', 'RETURNED'].includes(a.delivery.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={withdrawMutation.isPending}
                        onClick={() => withdrawMutation.mutate(a.id)}
                      >
                        Retirar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {(!assignments || assignments.length === 0) && (
              <p className="text-sm text-muted-foreground">No hay asignaciones recientes.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
