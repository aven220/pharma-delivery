import { useState, useMemo, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi, intermunicipalRoutesApi } from '@/services/api';
import { DELIVERY_STATUS_LABELS, INTERMUNICIPAL_ROUTE_STATUS_LABELS } from '@/constants/labels';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function IntermunicipalRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('intermunicipal_routes.write');
  const canManageDeliveries = hasPermission(
    'intermunicipal_routes.write',
    'intermunicipal_routes.add_deliveries',
    'calls.write'
  );
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [postponedDate, setPostponedDate] = useState('');

  const { data: route, refetch, isLoading } = useQuery({
    queryKey: ['intermunicipal-route', id],
    queryFn: async () => (await intermunicipalRoutesApi.getById(id!)).data.data,
    enabled: !!id,
  });

  const { data: availableDeliveries } = useQuery({
    queryKey: ['deliveries-for-route', id],
    queryFn: async () =>
      (await deliveriesApi.list({ status: 'CONFIRMED_FOR_DELIVERY', limit: 100 })).data.data,
    enabled:
      !!id &&
      !!route &&
      canManageDeliveries &&
      ['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status),
  });

  const { data: drivers } = useQuery({
    queryKey: ['intermunicipal-drivers'],
    queryFn: async () => (await intermunicipalRoutesApi.listDrivers()).data.data,
    enabled: canManage,
  });

  const invalidate = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['deliveries-for-route', id] });
    queryClient.invalidateQueries({ queryKey: ['intermunicipal-routes'] });
    queryClient.invalidateQueries({ queryKey: ['intermunicipal-dashboard'] });
  };

  const addMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.addDeliveries(id!, selectedDeliveryIds),
    onSuccess: () => {
      setSelectedDeliveryIds([]);
      invalidate();
      toast.success('Entregas agregadas a la ruta');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron agregar las entregas')),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.dispatch(id!),
    onSuccess: () => {
      invalidate();
      toast.success('Ruta despachada correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo despachar la ruta')),
  });

  const closeMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.close(id!),
    onSuccess: () => {
      invalidate();
      toast.success('Ruta finalizada correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cerrar la ruta')),
  });

  const cancelMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.cancel(id!, 'Cancelada por administrador'),
    onSuccess: () => {
      invalidate();
      toast.success('Ruta cancelada');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cancelar la ruta')),
  });

  const removeMutation = useMutation({
    mutationFn: (deliveryId: string) => intermunicipalRoutesApi.removeDelivery(id!, deliveryId),
    onSuccess: () => {
      invalidate();
      toast.success('Entrega quitada de la ruta');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo quitar la entrega')),
  });

  const transferMutation = useMutation({
    mutationFn: (newDriverId: string) => intermunicipalRoutesApi.transferDriver(id!, newDriverId),
    onSuccess: () => {
      invalidate();
      toast.success('Conductor transferido correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo transferir el conductor')),
  });

  const markInRouteMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.update(id!, { status: 'IN_ROUTE' }),
    onSuccess: () => {
      invalidate();
      toast.success('Ruta marcada en tránsito');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar la ruta')),
  });

  const postponeMutation = useMutation({
    mutationFn: (routeDate: string) => intermunicipalRoutesApi.update(id!, { routeDate }),
    onSuccess: () => {
      invalidate();
      toast.success('Fecha de la ruta actualizada');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cambiar la fecha')),
  });

  useEffect(() => {
    if (route?.routeDate) {
      setPostponedDate(toDateInputValue(route.routeDate));
    }
  }, [route?.routeDate]);

  const toggleDelivery = (deliveryId: string) => {
    setSelectedDeliveryIds((prev) =>
      prev.includes(deliveryId) ? prev.filter((x) => x !== deliveryId) : [...prev, deliveryId]
    );
  };

  const onRouteDeliveryIds = useMemo(
    () =>
      new Set(
        (route?.deliveries || []).map((item: { delivery: { id: string } }) => item.delivery.id)
      ),
    [route?.deliveries]
  );

  const selectableDeliveries = useMemo(
    () =>
      (availableDeliveries || []).filter(
        (d: { id: string }) => !onRouteDeliveryIds.has(d.id)
      ),
    [availableDeliveries, onRouteDeliveryIds]
  );

  if (isLoading || !route) return <p>Cargando ruta...</p>;

  const canEdit = canManageDeliveries && ['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status);
  const canPostpone = canManage && canEdit;
  const canDispatch = canManage && canEdit && route.stats.totalDeliveries > 0;
  const currentRouteDate = route.routeDate ? toDateInputValue(route.routeDate) : '';
  const dispatchBlockReason =
    !canManage
      ? 'Necesita permiso de edición de rutas intermunicipales.'
      : !['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status)
        ? 'La ruta ya fue despachada, está en tránsito o está cerrada.'
        : route.stats.totalDeliveries === 0
          ? 'Agregue al menos una entrega a la ruta.'
          : null;

  return (
    <div className="space-y-6">
      <Link to="/intermunicipal-routes" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a rutas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{route.routeCode}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
          {INTERMUNICIPAL_ROUTE_STATUS_LABELS[route.status] || route.status}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Información</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Municipio:</strong> {route.municipality.name}</p>
            <p><strong>Fecha:</strong> {new Date(route.routeDate).toLocaleDateString('es-CO')}</p>
            <p><strong>Conductor:</strong> {route.driver.firstName} {route.driver.lastName}</p>
            {route.observations && <p><strong>Observaciones:</strong> {route.observations}</p>}
            {route.dispatchedAt && (
              <p><strong>Despachada:</strong> {new Date(route.dispatchedAt).toLocaleString('es-CO')}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Totales</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <p>Paquetes: <strong>{route.stats.totalPackages}</strong></p>
            <p>Pacientes: <strong>{route.stats.totalPatients}</strong></p>
            <p>Entregas: <strong>{route.stats.totalDeliveries}</strong></p>
            <p>Medicamentos: <strong>{route.stats.totalMedications}</strong></p>
            <p>Entregadas: <strong>{route.stats.deliveredCount}</strong></p>
            <p>Pendientes: <strong>{route.stats.pendingCount}</strong></p>
          </CardContent>
        </Card>
      </div>

      {canManage && ['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status) && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Despacho de ruta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Puede despachar cuando la ruta está en <strong>Preparación</strong> o{' '}
              <strong>Lista para despacho</strong>, tiene al menos una entrega y usted tiene permisos
              de administración.
            </p>
            <p>
              La fecha programada es informativa: puede posponerla abajo si no alcanza a despachar hoy.
              El despacho no exige que la fecha sea hoy.
            </p>
            {dispatchBlockReason && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Aún no puede despachar: {dispatchBlockReason}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canPostpone && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reprogramar fecha</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Si no puede despachar hoy, cambie la fecha (por ejemplo, al día siguiente). Solo
              disponible mientras la ruta no haya sido despachada.
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="route-date">Nueva fecha</Label>
              <Input
                id="route-date"
                type="date"
                className="mt-1 w-auto"
                value={postponedDate}
                onChange={(e) => setPostponedDate(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              disabled={
                !postponedDate ||
                postponedDate === currentRouteDate ||
                postponeMutation.isPending
              }
              onClick={() => postponeMutation.mutate(postponedDate)}
            >
              Guardar nueva fecha
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {canDispatch && (
          <Button onClick={() => dispatchMutation.mutate()} disabled={dispatchMutation.isPending}>
            Despachar ruta
          </Button>
        )}
        {canManage && route.status === 'DISPATCHED' && (
          <Button
            variant="outline"
            onClick={() => markInRouteMutation.mutate()}
            disabled={markInRouteMutation.isPending}
          >
            Marcar en ruta
          </Button>
        )}
        {canManage && !['COMPLETED', 'CANCELLED'].includes(route.status) && (
          <Button variant="outline" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
            Finalizar ruta
          </Button>
        )}
        {canManage && !['COMPLETED', 'CANCELLED'].includes(route.status) && (
          <Button variant="ghost" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
            Cancelar ruta
          </Button>
        )}
        {canManage && (
          <select
            className="rounded-md border px-3 py-2 text-sm"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) transferMutation.mutate(e.target.value);
            }}
          >
            <option value="">Transferir a conductor...</option>
            {(drivers || []).filter((d: { id: string }) => d.id !== route.driver.id).map((d: { id: string; firstName: string; lastName: string }) => (
              <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
            ))}
          </select>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Entregas en la ruta ({route.deliveries.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {route.deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas agregadas.</p>
          ) : (
            route.deliveries.map((item: {
              id: string;
              stopOrder: number;
              delivery: {
                id: string;
                deliveryNumber: string;
                status: string;
                patient: { firstName: string; lastName: string; documentId: string; phone?: string; address: string };
                items: Array<{ quantity: number; medication: { name: string } }>;
              };
            }) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    #{item.stopOrder + 1} {item.delivery.deliveryNumber} — {item.delivery.patient.firstName} {item.delivery.patient.lastName}
                  </p>
                  <p className="text-muted-foreground">Doc: {item.delivery.patient.documentId} · Tel: {item.delivery.patient.phone || '—'}</p>
                  <p>{item.delivery.patient.address}</p>
                  <p className="text-muted-foreground">
                    {item.delivery.items.map((i) => `${i.medication.name} x${i.quantity}`).join(', ')}
                  </p>
                  <p>Estado: {DELIVERY_STATUS_LABELS[item.delivery.status] || item.delivery.status}</p>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(item.delivery.id)}>
                    Quitar
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar entregas confirmadas</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Solo pedidos confirmados para entrega. Las entregas urbanas del día siguen en Asignaciones / Rutas diarias.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {selectableDeliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay más entregas confirmadas disponibles. Las que ya agregó aparecen arriba en
                  &quot;Entregas en la ruta&quot;; use Quitar para devolverlas aquí.
                </p>
              ) : (
                selectableDeliveries.map((d: {
                  id: string;
                  deliveryNumber: string;
                  patient: { firstName: string; lastName: string; documentId: string };
                }) => (
                  <label key={d.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedDeliveryIds.includes(d.id)}
                      onChange={() => toggleDelivery(d.id)}
                    />
                    {d.deliveryNumber} — {d.patient.firstName} {d.patient.lastName} ({d.patient.documentId})
                  </label>
                ))
              )}
            </div>
            <Button
              disabled={selectedDeliveryIds.length === 0 || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              Agregar {selectedDeliveryIds.length} entrega(s)
            </Button>
          </CardContent>
        </Card>
      )}

      {route.history?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {route.history.map((h: { id: string; action: string; createdAt: string; notes?: string; createdBy: { firstName: string; lastName: string } }) => (
              <div key={h.id} className="rounded-md border p-2">
                <p className="font-medium">{h.action}</p>
                <p className="text-muted-foreground">
                  {new Date(h.createdAt).toLocaleString('es-CO')} — {h.createdBy.firstName} {h.createdBy.lastName}
                </p>
                {h.notes && <p>{h.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
