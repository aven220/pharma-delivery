import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { patientsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PatientHistoryPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['patient-history', id],
    queryFn: async () => (await patientsApi.getHistory(id!)).data.data,
    enabled: !!id,
  });

  if (isLoading) return <div>Cargando historial...</div>;
  if (!data) return <div>Paciente no encontrado</div>;

  const { patient, changeLogs, deliveries, callHistory, incidents, statusLogs } = data;

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">
        Historial: {patient.firstName} {patient.lastName}
      </h2>
      <p className="text-muted-foreground">{patient.documentType} {patient.documentId}</p>

      <Card>
        <CardHeader><CardTitle>Historial de estados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(statusLogs || []).map((log: {
            id: string;
            fromStatus: string | null;
            toStatus: string;
            action: string;
            observations: string | null;
            deactivationReason: string | null;
            pendingSubreason: string | null;
            createdAt: string;
            changedBy: { firstName: string; lastName: string };
            delivery: { deliveryNumber: string };
          }) => (
            <div key={log.id} className="rounded-md border p-3 text-sm">
              <strong>{log.delivery.deliveryNumber}</strong>: {log.fromStatus || '—'} → {log.toStatus} ({log.action})
              {log.deactivationReason && <span> · Baja: {log.deactivationReason}</span>}
              {log.pendingSubreason && <span> · Pendiente: {log.pendingSubreason}</span>}
              {log.observations && <p>{log.observations}</p>}
              <div className="text-muted-foreground">
                {log.changedBy.firstName} {log.changedBy.lastName} · {new Date(log.createdAt).toLocaleString('es-CO')}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Auditoría de cambios</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(changeLogs || []).map((log: {
            id: string;
            field: string;
            oldValue: string | null;
            newValue: string | null;
            createdAt: string;
            changedBy: { firstName: string; lastName: string };
          }) => (
            <div key={log.id} className="rounded-md border p-3 text-sm">
              <strong>{log.field}</strong>: {log.oldValue || '—'} → {log.newValue || '—'}
              <div className="text-muted-foreground">
                {log.changedBy.firstName} {log.changedBy.lastName} · {new Date(log.createdAt).toLocaleString('es-CO')}
              </div>
            </div>
          ))}
          {changeLogs.length === 0 && <p className="text-sm text-muted-foreground">Sin cambios registrados.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Entregas ({deliveries.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {deliveries.map((d: { id: string; deliveryNumber: string; status: string; createdAt: string }) => (
            <div key={d.id} className="rounded-md border p-3 text-sm">
              {d.deliveryNumber} · {d.status} · {new Date(d.createdAt).toLocaleDateString('es-CO')}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Llamadas ({callHistory.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {callHistory.map((c: {
            id: string;
            result: string;
            phoneUsed: string;
            observations: string | null;
            calledAt: string;
            delivery: { deliveryNumber: string };
          }) => (
            <div key={c.id} className="rounded-md border p-3 text-sm">
              {c.delivery.deliveryNumber} · {c.result} · {c.phoneUsed}
              {c.observations && <p className="text-muted-foreground">{c.observations}</p>}
              <div className="text-muted-foreground">{new Date(c.calledAt).toLocaleString('es-CO')}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Incidencias ({incidents.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {incidents.map((i: {
            id: string;
            type: string;
            status: string;
            description: string;
            createdAt: string;
            delivery: { deliveryNumber: string };
          }) => (
            <div key={i.id} className="rounded-md border p-3 text-sm">
              {i.delivery.deliveryNumber} · {i.type} · {i.status}
              <p>{i.description}</p>
              <div className="text-muted-foreground">{new Date(i.createdAt).toLocaleString('es-CO')}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
