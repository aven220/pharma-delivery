import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intermunicipalRoutesApi } from '@/services/api';
import { INTERMUNICIPAL_ROUTE_STATUS_LABELS, OPERATIONAL_TYPE_LABELS } from '@/constants/labels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/textarea';
import { PermissionGate } from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugMunicipality(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .slice(0, 16);
}

interface RouteAssignee {
  id: string;
  firstName: string;
  lastName: string;
  operationalType?: string;
  courierProfile?: { code: string; zone?: string | null };
}

interface Municipality {
  id: string;
  name: string;
  code?: string;
}

interface IntermunicipalRouteRow {
  municipality: { name: string };
}

export function IntermunicipalRoutesPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canManage = hasPermission('intermunicipal_routes.write');
  const [showForm, setShowForm] = useState(false);
  const [viewTodayOnly, setViewTodayOnly] = useState(true);
  const [routeView, setRouteView] = useState<'active' | 'finished'>('active');
  const today = todayIso();
  const [form, setForm] = useState({
    routeCode: '',
    routeDate: today,
    driverId: '',
    municipalityId: '',
    observations: '',
  });
  const [codeTouched, setCodeTouched] = useState(false);

  const listParams = viewTodayOnly
    ? { limit: 50, dateFrom: today, dateTo: today }
    : { limit: 50 };

  const { data: dashboard } = useQuery({
    queryKey: ['intermunicipal-dashboard'],
    queryFn: async () => (await intermunicipalRoutesApi.dashboard()).data.data,
  });

  const { data: routes, isLoading } = useQuery({
    queryKey: ['intermunicipal-routes', viewTodayOnly, today],
    queryFn: async () => (await intermunicipalRoutesApi.list(listParams)).data.data,
  });

  const { data: assignees, isLoading: loadingAssignees } = useQuery({
    queryKey: ['intermunicipal-drivers'],
    queryFn: async () => (await intermunicipalRoutesApi.listDrivers()).data.data as RouteAssignee[],
    enabled: canManage,
  });

  const { data: municipalities, isLoading: loadingMunicipalities } = useQuery({
    queryKey: ['route-municipalities-active'],
    queryFn: async () =>
      (await intermunicipalRoutesApi.listMunicipalities({ activeOnly: true, limit: 100 })).data
        .data as Municipality[],
    enabled: canManage,
  });

  const selectedAssignee = useMemo(
    () => (assignees || []).find((d) => d.id === form.driverId),
    [assignees, form.driverId]
  );

  const { data: driverActiveRoutes } = useQuery({
    queryKey: ['driver-active-routes', form.driverId],
    queryFn: async () =>
      (await intermunicipalRoutesApi.getDriverActiveRoutes(form.driverId)).data.data as Array<{
        id: string;
        routeCode: string;
        routeDate: string;
        status: string;
        municipality: { name: string };
        deliveryCount: number;
      }>,
    enabled: !!form.driverId && canManage,
  });

  const displayedRoutes = useMemo(() => {
    const list = routes || [];
    return list.filter((route: { status: string }) =>
      routeView === 'finished'
        ? ['COMPLETED', 'CANCELLED'].includes(route.status)
        : !['COMPLETED', 'CANCELLED'].includes(route.status)
    );
  }, [routes, routeView]);

  const selectedMunicipality = useMemo(
    () => (municipalities || []).find((m) => m.id === form.municipalityId),
    [municipalities, form.municipalityId]
  );

  useEffect(() => {
    if (!selectedMunicipality || codeTouched) return;
    const base = selectedMunicipality.code || slugMunicipality(selectedMunicipality.name);
    setForm((prev) => ({
      ...prev,
      routeCode: `${base}-${form.routeDate.replace(/-/g, '')}`,
    }));
  }, [selectedMunicipality, form.routeDate, codeTouched]);

  const createMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.create(form),
    onSuccess: () => {
      setShowForm(false);
      setCodeTouched(false);
      setForm({
        routeCode: '',
        routeDate: today,
        driverId: '',
        municipalityId: '',
        observations: '',
      });
      queryClient.invalidateQueries({ queryKey: ['intermunicipal-routes'] });
      queryClient.invalidateQueries({ queryKey: ['intermunicipal-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['prepare-today-intermunicipal'] });
      toast.success('Ruta creada. El operador puede agregar pedidos confirmados.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo crear la ruta')),
  });

  const todayMunicipalityNames = Array.from(
    new Set(
      ((routes || []) as IntermunicipalRouteRow[]).map((r) => r.municipality.name)
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Rutas intermunicipales</h2>
          <p className="text-sm text-muted-foreground">
            {viewTodayOnly
              ? `Destinos programados para hoy (${new Date(today).toLocaleDateString('es-CO')})`
              : 'Historial de rutas intermunicipales'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewTodayOnly ? 'default' : 'outline'}
            onClick={() => setViewTodayOnly(true)}
          >
            Rutas de hoy
          </Button>
          <Button
            variant={!viewTodayOnly ? 'default' : 'outline'}
            onClick={() => setViewTodayOnly(false)}
          >
            Ver todas
          </Button>
          <PermissionGate permissions={['intermunicipal_routes.write']}>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : 'Nueva ruta'}
            </Button>
          </PermissionGate>
        </div>
      </div>

      {viewTodayOnly && (routes || []).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Destinos de hoy</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {todayMunicipalityNames.map((name) => (
              <span key={name} className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
                {name}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {dashboard && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Programadas</p><p className="text-2xl font-bold">{dashboard.scheduled}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Despachadas</p><p className="text-2xl font-bold">{dashboard.dispatched}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">En ruta</p><p className="text-2xl font-bold">{dashboard.inRoute}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Finalizadas</p><p className="text-2xl font-bold">{dashboard.completed}</p></CardContent></Card>
        </div>
      )}

      {showForm && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Crear ruta intermunicipal</CardTitle>
            <p className="text-sm text-muted-foreground">
              Elija el municipio destino (ej. Piendamó) y quién llevará la ruta. Luego el operador
              agrega los pedidos confirmados. Las entregas urbanas (domicilios locales) siguen en
              Rutas diarias / Asignaciones.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Municipio destino *</Label>
              <Select
                className="mt-1"
                value={form.municipalityId}
                onChange={(e) => setForm({ ...form, municipalityId: e.target.value })}
              >
                <option value="">
                  {loadingMunicipalities ? 'Cargando...' : 'Seleccionar municipio'}
                </option>
                {(municipalities || []).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Fecha de la ruta *</Label>
              <Input
                className="mt-1"
                type="date"
                value={form.routeDate}
                onChange={(e) => setForm({ ...form, routeDate: e.target.value })}
              />
            </div>
            <div>
              <Label>Código de ruta *</Label>
              <Input
                className="mt-1"
                placeholder="Ej: PIENDAMO-20260530"
                value={form.routeCode}
                onChange={(e) => {
                  setCodeTouched(true);
                  setForm({ ...form, routeCode: e.target.value.toUpperCase() });
                }}
              />
            </div>
            <div>
              <Label>Responsable (conductor o domiciliario) *</Label>
              <Select
                className="mt-1"
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: e.target.value })}
              >
                <option value="">
                  {loadingAssignees ? 'Cargando...' : 'Seleccionar responsable'}
                </option>
                {(assignees || []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                    {d.operationalType
                      ? ` — ${OPERATIONAL_TYPE_LABELS[d.operationalType] || d.operationalType}`
                      : ''}
                    {d.courierProfile?.code ? ` (${d.courierProfile.code})` : ''}
                  </option>
                ))}
              </Select>
              {!loadingAssignees && (assignees || []).length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  No hay domiciliarios ni conductores activos. Cree usuarios con rol Domiciliario
                  y tipo operativo Conductor de ruta o Domiciliario urbano en Usuarios.
                </p>
              )}
              {form.driverId && selectedAssignee && (
                <div className="mt-3 rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">
                    {selectedAssignee.firstName} {selectedAssignee.lastName}
                    {selectedAssignee.operationalType === 'CONDUCTOR_RUTA' ? ' · Conductor de ruta' : ''}
                  </p>
                  {(driverActiveRoutes || []).length === 0 ? (
                    <p className="text-muted-foreground">Sin rutas activas asignadas.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Rutas activas</p>
                      {(driverActiveRoutes || []).map((route) => (
                        <div key={route.id} className="rounded border bg-background p-2">
                          <p className="font-medium">{route.routeCode}</p>
                          <p className="text-muted-foreground">
                            Municipio: {route.municipality.name} ·{' '}
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
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <Label>Observaciones</Label>
              <Input
                className="mt-1"
                placeholder="Opcional"
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Button
                disabled={
                  !form.routeCode.trim() ||
                  !form.driverId ||
                  !form.municipalityId ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? 'Creando...' : 'Crear ruta en preparación'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {dashboard?.byMunicipality?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Métricas por municipio</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2">Municipio</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Entregadas</th>
                  <th className="p-2">Pendientes</th>
                  <th className="p-2">Fallidas</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.byMunicipality.map((m: { municipality: { name: string }; total: number; delivered: number; pending: number; failed: number }) => (
                  <tr key={m.municipality.name} className="border-b">
                    <td className="p-2">{m.municipality.name}</td>
                    <td className="p-2">{m.total}</td>
                    <td className="p-2">{m.delivered}</td>
                    <td className="p-2">{m.pending}</td>
                    <td className="p-2">{m.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={routeView === 'active' ? 'default' : 'outline'}
          onClick={() => setRouteView('active')}
        >
          Rutas activas
        </Button>
        <Button
          variant={routeView === 'finished' ? 'default' : 'outline'}
          onClick={() => setRouteView('finished')}
        >
          Rutas finalizadas
        </Button>
      </div>

      {isLoading ? (
        <p>Cargando rutas...</p>
      ) : displayedRoutes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {routeView === 'finished'
              ? 'No hay rutas finalizadas en el periodo seleccionado.'
              : viewTodayOnly
                ? 'No hay rutas intermunicipales activas para hoy.'
                : 'No hay rutas intermunicipales activas registradas.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayedRoutes.map((route: {
            id: string;
            routeCode: string;
            routeDate: string;
            status: string;
            closedAt?: string | null;
            municipality: { name: string };
            driver: { firstName: string; lastName: string };
            stats: { totalDeliveries: number; totalPatients: number; totalMedications: number };
          }) => (
            <Link key={route.id} to={`/intermunicipal-routes/${route.id}`} className="block rounded-lg border p-4 hover:bg-muted/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{route.routeCode}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Municipio:</span> {route.municipality.name}</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Conductor:</span>{' '}
                    {route.driver.firstName} {route.driver.lastName}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Fecha:</span>{' '}
                    {new Date(route.routeDate).toLocaleDateString('es-CO')}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Entregas:</span> {route.stats.totalDeliveries}
                  </p>
                  {route.closedAt && (
                    <p className="text-xs text-muted-foreground">
                      Cierre: {new Date(route.closedAt).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium">
                  {INTERMUNICIPAL_ROUTE_STATUS_LABELS[route.status] || route.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
