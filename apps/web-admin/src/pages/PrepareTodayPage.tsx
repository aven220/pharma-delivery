import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { intermunicipalRoutesApi, couriersApi } from '@/services/api';
import { INTERMUNICIPAL_ROUTE_STATUS_LABELS } from '@/constants/labels';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Route, MapPinned, ChevronRight } from 'lucide-react';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const PREPARE_STATUSES = new Set(['PREPARATION', 'READY_FOR_DISPATCH']);

interface IntermunicipalRouteRow {
  id: string;
  routeCode: string;
  routeDate: string;
  status: string;
  municipality: { name: string };
  driver: { firstName: string; lastName: string };
  stats: { totalDeliveries: number; totalPatients: number; totalMedications: number; totalPackages: number };
}

interface CourierRouteRow {
  id: string;
  routeDate: string;
  status: string;
  totalStops: number;
  pendingStops: number;
  courier: { firstName: string; lastName: string };
  assignments: Array<{
    routeOrder: number;
    delivery: {
      deliveryNumber: string;
      patient: { firstName: string; lastName: string };
    };
  }>;
}

export function PrepareTodayPage() {
  const today = todayIso();
  const todayLabel = new Date(today).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const { data: intermunicipalRoutes, isLoading: loadingInter } = useQuery({
    queryKey: ['prepare-today-intermunicipal', today],
    queryFn: async () =>
      (await intermunicipalRoutesApi.list({ dateFrom: today, dateTo: today, limit: 100 })).data
        .data as IntermunicipalRouteRow[],
  });

  const { data: courierRoutes, isLoading: loadingCourier } = useQuery({
    queryKey: ['prepare-today-courier', today],
    queryFn: async () =>
      (await couriersApi.listRoutes({ dateFrom: today, dateTo: today })).data.data as CourierRouteRow[],
  });

  const toPrepare = (intermunicipalRoutes || []).filter((r) => PREPARE_STATUSES.has(r.status));
  const otherInterToday = (intermunicipalRoutes || []).filter((r) => !PREPARE_STATUSES.has(r.status));
  const activeCourierRoutes = (courierRoutes || []).filter((r) => r.pendingStops > 0 || r.totalStops > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Preparar paquetes hoy</h2>
        <p className="mt-1 capitalize text-muted-foreground">{todayLabel}</p>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Aquí ves las rutas programadas para hoy. Separa los paquetes por destino o domiciliario
          y abre el detalle para ver la lista completa de medicamentos por paciente.
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPinned className="h-5 w-5 text-amber-700" />
            Rutas intermunicipales a preparar ({toPrepare.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInter && <p className="text-sm text-muted-foreground">Cargando rutas...</p>}
          {!loadingInter && toPrepare.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay rutas intermunicipales en preparación para hoy. El supervisor debe crear la ruta
              y agregar las entregas confirmadas.
            </p>
          )}
          {toPrepare.map((route) => (
            <div
              key={route.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-4"
            >
              <div>
                <p className="font-semibold">
                  {route.routeCode} → {route.municipality.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Conductor: {route.driver.firstName} {route.driver.lastName}
                </p>
                <p className="mt-1 text-sm">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">
                    {INTERMUNICIPAL_ROUTE_STATUS_LABELS[route.status] || route.status}
                  </span>
                  {' · '}
                  {route.stats.totalDeliveries} entregas · {route.stats.totalPatients} pacientes ·{' '}
                  {route.stats.totalMedications} medicamentos
                </p>
              </div>
              <Button asChild>
                <Link to={`/intermunicipal-routes/${route.id}`}>
                  Ver lista de paquetes
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5 text-primary" />
            Rutas domiciliario hoy ({activeCourierRoutes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingCourier && <p className="text-sm text-muted-foreground">Cargando rutas...</p>}
          {!loadingCourier && activeCourierRoutes.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No hay rutas de domiciliario con entregas para hoy. Revisa en Asignaciones si hay
              entregas confirmadas pendientes de asignar.
            </p>
          )}
          {activeCourierRoutes.map((route) => (
            <div key={route.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {route.courier.firstName} {route.courier.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {route.pendingStops} pendiente(s) · {route.totalStops} parada(s) en total
                  </p>
                </div>
                <Button variant="outline" asChild size="sm">
                  <Link to="/courier-routes">Ver ruta completa</Link>
                </Button>
              </div>
              {route.assignments.length > 0 && (
                <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                  {route.assignments.slice(0, 8).map((a) => (
                    <li key={`${route.id}-${a.routeOrder}`} className="flex gap-2 text-muted-foreground">
                      <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        #{a.routeOrder + 1} {a.delivery.deliveryNumber} —{' '}
                        {a.delivery.patient.firstName} {a.delivery.patient.lastName}
                      </span>
                    </li>
                  ))}
                  {route.assignments.length > 8 && (
                    <li className="text-xs text-muted-foreground">
                      +{route.assignments.length - 8} entrega(s) más en la ruta completa
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {otherInterToday.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Otras rutas intermunicipales de hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {otherInterToday.map((route) => (
              <Link
                key={route.id}
                to={`/intermunicipal-routes/${route.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 hover:bg-muted/40"
              >
                <span>
                  {route.routeCode} → {route.municipality.name} ({route.driver.firstName}{' '}
                  {route.driver.lastName})
                </span>
                <span className="text-muted-foreground">
                  {INTERMUNICIPAL_ROUTE_STATUS_LABELS[route.status] || route.status}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 text-sm">
        <Button variant="outline" asChild size="sm">
          <Link to="/intermunicipal-routes">Todas las rutas intermunicipales</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/courier-routes">Todas las rutas diarias</Link>
        </Button>
        <Button variant="outline" asChild size="sm">
          <Link to="/assignments">Asignaciones</Link>
        </Button>
      </div>
    </div>
  );
}
