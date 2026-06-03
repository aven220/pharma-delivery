import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { couriersApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGate } from '@/components/PermissionGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import { Calendar, Bell, Route } from 'lucide-react';
import { ROUTE_STATUS_LABELS, ASSIGNMENT_STATUS_LABELS } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

interface CourierOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RouteAssignment {
  id: string;
  routeOrder: number;
  status: string;
  delivery: {
    deliveryNumber: string;
    status: string;
    patient: { firstName: string; lastName: string };
  };
}

interface CourierRoute {
  id: string;
  routeDate: string;
  status: string;
  totalStops: number;
  completedStops: number;
  pendingStops: number;
  notes: string | null;
  notifiedAt: string | null;
  courier: CourierOption;
  assignments: RouteAssignment[];
  carriedFrom?: { id: string; routeDate: string } | null;
}

const ROUTE_STATUS_LABELS_LOCAL = ROUTE_STATUS_LABELS;

function routeCode(route: CourierRoute): string {
  const date = new Date(route.routeDate).toISOString().slice(0, 10).replace(/-/g, '');
  return `RUTA-${date}-${route.id.slice(-4).toUpperCase()}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function CourierRoutesPage() {
  const today = todayIso();
  const [courierId, setCourierId] = useState('');
  const [viewTodayOnly, setViewTodayOnly] = useState(true);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [carryTargetDate, setCarryTargetDate] = useState(tomorrowIso);

  const { data: couriers } = useQuery({
    queryKey: ['couriers-routes-picker'],
    queryFn: async () => {
      const res = await couriersApi.list({ limit: 100 });
      return res.data.data as CourierOption[];
    },
  });

  const { data: routes, refetch, isLoading } = useQuery({
    queryKey: ['courier-routes', courierId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await couriersApi.listRoutes({
        courierId: courierId || undefined,
        dateFrom,
        dateTo,
      });
      return res.data.data as CourierRoute[];
    },
  });

  const carryOverMutation = useMutation({
    mutationFn: ({ routeId, targetDate }: { routeId: string; targetDate: string }) =>
      couriersApi.carryOverRoute(routeId, targetDate),
    onSuccess: () => {
      refetch();
      toast.success('Ruta trasladada al día siguiente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo trasladar la ruta')),
  });

  const selectedCourier = useMemo(
    () => couriers?.find((c) => c.id === courierId),
    [couriers, courierId]
  );

  const applyTodayFilter = () => {
    setViewTodayOnly(true);
    setDateFrom(today);
    setDateTo(today);
  };

  const applyWeekFilter = () => {
    setViewTodayOnly(false);
    const from = new Date();
    from.setDate(from.getDate() - 7);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(today);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Route className="h-8 w-8 text-primary" />
        <div>
          <h2 className="text-3xl font-bold">Rutas diarias</h2>
          <p className="text-sm text-muted-foreground">
            {viewTodayOnly
              ? `Entregas locales programadas para hoy (${new Date(today).toLocaleDateString('es-CO')})`
              : 'Historial de rutas por domiciliario'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={viewTodayOnly ? 'default' : 'outline'} onClick={applyTodayFilter}>
          Rutas de hoy
        </Button>
        <Button variant={!viewTodayOnly ? 'default' : 'outline'} onClick={applyWeekFilter}>
          Últimos 7 días
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Domiciliario</Label>
            <Select value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              <option value="">Todos</option>
              {(couriers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={() => refetch()}>
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de rutas
            {selectedCourier && (
              <span className="text-base font-normal text-muted-foreground">
                — {selectedCourier.firstName} {selectedCourier.lastName}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando rutas...</p>}
          {!isLoading && (routes || []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              {viewTodayOnly
                ? 'No hay rutas diarias programadas para hoy.'
                : 'No hay rutas en el rango seleccionado.'}
            </p>
          )}

          {(routes || []).map((route) => (
            <div key={route.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{routeCode(route)}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Conductor:</span>{' '}
                    {route.courier.firstName} {route.courier.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Fecha:</span>{' '}
                    {new Date(route.routeDate).toLocaleDateString('es-CO')}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Entregas:</span> {route.totalStops}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {route.completedStops}/{route.totalStops} completadas ·{' '}
                    {route.pendingStops} pendiente(s)
                  </p>
                  {route.carriedFrom && (
                    <div className="text-xs text-muted-foreground">
                      Trasladada desde {new Date(route.carriedFrom.routeDate).toLocaleDateString('es-CO')}
                    </div>
                  )}
                  {route.notifiedAt && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                      <Bell className="h-3 w-3" />
                      Notificado {new Date(route.notifiedAt).toLocaleString('es-CO')}
                    </div>
                  )}
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
                  {ROUTE_STATUS_LABELS_LOCAL[route.status] || route.status}
                </span>
              </div>

              {route.pendingStops > 0 && route.status !== 'CLOSED' && (
                <PermissionGate permissions={['assignments.write']}>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <div>
                      <Label className="text-xs">Programar para</Label>
                      <Input
                        type="date"
                        className="w-40"
                        value={carryTargetDate}
                        onChange={(e) => setCarryTargetDate(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      disabled={carryOverMutation.isPending}
                      onClick={() =>
                        carryOverMutation.mutate({ routeId: route.id, targetDate: carryTargetDate })
                      }
                    >
                      Pasar pendientes y notificar
                    </Button>
                  </div>
                </PermissionGate>
              )}

              {route.assignments.length > 0 && (
                <div className="mt-3 space-y-1 border-t pt-3">
                  {route.assignments.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>
                        #{a.routeOrder + 1} {a.delivery.deliveryNumber} —{' '}
                        {a.delivery.patient.firstName} {a.delivery.patient.lastName}
                      </span>
                      <span className="text-muted-foreground">
                        {ASSIGNMENT_STATUS_LABELS[a.status] || a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
