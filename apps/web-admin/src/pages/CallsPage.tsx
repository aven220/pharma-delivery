import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from '@/store/toast.store';
import { CALL_MANAGEMENT_LABELS, translateLabel } from '@/constants/labels';
import { getApiErrorMessage } from '@/lib/api-error';

export function CallsPage({ embedded = false }: { embedded?: boolean }) {
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [operatorId, setOperatorId] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['call-stats'],
    queryFn: async () => (await callsApi.stats()).data.data,
  });

  const { data: mgmtStats } = useQuery({
    queryKey: ['call-mgmt-stats'],
    queryFn: async () => (await callsApi.managementStats()).data.data,
  });

  const { data: monitoring } = useQuery({
    queryKey: ['call-operator-monitoring'],
    queryFn: async () => (await callsApi.operatorMonitoring()).data.data,
    enabled: hasPermission('calls.assign', 'calls.read', 'dashboard.read'),
  });

  const { data: calls, isLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => (await callsApi.list({ limit: 50 })).data.data,
  });

  const { data: pendingDeliveries } = useQuery({
    queryKey: ['calls-pending-deliveries'],
    queryFn: async () => (await callsApi.pending({ limit: 50 })).data.data,
    enabled: hasPermission('calls.assign'),
  });

  const { data: operators } = useQuery({
    queryKey: ['call-operators'],
    queryFn: async () => (await callsApi.operators()).data.data,
    enabled: hasPermission('calls.assign'),
  });

  const assignMutation = useMutation({
    mutationFn: () => callsApi.assign({ deliveryIds: selectedDeliveries, operatorUserId: operatorId }),
    onSuccess: () => {
      setSelectedDeliveries([]);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      toast.success('Llamadas asignadas correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron asignar las llamadas')),
  });

  return (
    <div className="space-y-6">
      {!embedded && <h2 className="text-3xl font-bold">Llamadas</h2>}

      {stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Llamadas hoy</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Contestadas</p><p className="text-3xl font-bold">{stats.answered}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Efectividad llamadas</p><p className="text-3xl font-bold">{stats.effectiveness}%</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Gestiones completadas</p><p className="text-3xl font-bold">{mgmtStats?.total || 0}</p></CardContent></Card>
        </div>
      )}

      {mgmtStats?.byResult && (
        <Card>
          <CardHeader><CardTitle>Resultados de gestión</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {mgmtStats.byResult.map((r: { result: string; count: number }) => (
              <div key={r.result} className="rounded-md border px-4 py-2 text-sm">
                <strong>{translateLabel(CALL_MANAGEMENT_LABELS, r.result)}</strong>: {r.count}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {monitoring && (
        <Card>
          <CardHeader>
            <CardTitle>Monitoreo de operadores (hoy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="rounded-md border px-3 py-2">
                Completadas: <strong>{monitoring.totalCompleted}</strong>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                Sin pulsar Llamar: <strong>{monitoring.alerts?.withoutDial ?? 0}</strong>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                Confirmadas con duración &lt; 5s: <strong>{monitoring.alerts?.shortDuration ?? 0}</strong>
              </div>
            </div>
            <div className="overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/80 text-left">
                  <tr>
                    <th className="p-2">Operador</th>
                    <th className="p-2">Gestiones</th>
                    <th className="p-2">Con marcar</th>
                    <th className="p-2">Sin marcar</th>
                    <th className="p-2">% marcar</th>
                    <th className="p-2">Dur. prom.</th>
                    <th className="p-2">Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {(monitoring.operators || []).map(
                    (op: {
                      operatorId: string;
                      name: string;
                      total: number;
                      withDial: number;
                      withoutDial: number;
                      dialRate: number;
                      avgDurationSec: number;
                      alertLevel: string;
                    }) => (
                      <tr key={op.operatorId} className="border-t">
                        <td className="p-2">{op.name}</td>
                        <td className="p-2">{op.total}</td>
                        <td className="p-2">{op.withDial}</td>
                        <td className="p-2">{op.withoutDial}</td>
                        <td className="p-2">{op.dialRate}%</td>
                        <td className="p-2">{op.avgDurationSec}s</td>
                        <td className="p-2">
                          <span
                            className={
                              op.alertLevel === 'red'
                                ? 'rounded bg-red-100 px-2 py-0.5 text-red-800'
                                : op.alertLevel === 'yellow'
                                  ? 'rounded bg-amber-100 px-2 py-0.5 text-amber-900'
                                  : 'rounded bg-green-100 px-2 py-0.5 text-green-800'
                            }
                          >
                            {op.alertLevel === 'red'
                              ? 'Revisar'
                              : op.alertLevel === 'yellow'
                                ? 'Atención'
                                : 'OK'}
                          </span>
                        </td>
                      </tr>
                    )
                  )}
                  {(monitoring.operators || []).length === 0 && (
                    <tr>
                      <td className="p-3 text-muted-foreground" colSpan={7}>
                        Sin gestiones completadas hoy.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {hasPermission('calls.assign') && (
        <Card>
          <CardHeader><CardTitle>Asignar llamadas a operador</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
              <option value="">Seleccionar operador</option>
              {(operators || []).map((op: { id: string; firstName: string; lastName: string }) => (
                <option key={op.id} value={op.id}>{op.firstName} {op.lastName}</option>
              ))}
            </Select>
            <div className="max-h-48 space-y-2 overflow-auto">
              {(pendingDeliveries || []).map((d: { id: string; deliveryNumber: string; patient: { firstName: string; lastName: string } }) => (
                <label key={d.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDeliveries.includes(d.id)}
                    onChange={() =>
                      setSelectedDeliveries((prev) =>
                        prev.includes(d.id) ? prev.filter((x) => x !== d.id) : [...prev, d.id]
                      )
                    }
                  />
                  {d.deliveryNumber} — {d.patient.firstName} {d.patient.lastName}
                </label>
              ))}
            </div>
            <Button
              disabled={!operatorId || selectedDeliveries.length === 0 || assignMutation.isPending}
              onClick={() => assignMutation.mutate()}
            >
              Asignar {selectedDeliveries.length} llamada(s)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Historial reciente</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="space-y-2">
              {(calls || []).map((call: {
                id: string;
                result: string;
                phoneUsed: string;
                calledAt: string;
                delivery: { deliveryNumber: string };
                patient: { firstName: string; lastName: string };
              }) => (
                <div key={call.id} className="flex justify-between rounded-md border p-3 text-sm">
                  <div>
                    <span className="font-medium">{call.delivery.deliveryNumber}</span>
                    <span className="mx-2 text-muted-foreground">|</span>
                    {call.patient.firstName} {call.patient.lastName}
                  </div>
                  <div className="text-muted-foreground">
                    {call.result} - {call.phoneUsed} - {new Date(call.calledAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
