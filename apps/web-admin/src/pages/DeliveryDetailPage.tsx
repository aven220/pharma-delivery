import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, deliveriesApi, evidenceApi, incidentsApi, deliveryStatusApi } from '@/services/api';
import { DELIVERY_STATUS_LABELS, INCIDENT_LABELS, PRIORITY_LABELS } from '@/constants/labels';
import { PermissionGate } from '@/components/PermissionGate';
import { ArrowLeft } from 'lucide-react';
import type { DeliveryDTO } from '@pharma/types';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

function EvidencePhoto({ evidenceId, alt }: { evidenceId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get(`/api/evidence/${evidenceId}/file`, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setSrc(null);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidenceId]);

  if (!src) {
    return <div className="flex h-40 items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">Cargando foto...</div>;
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border">
      <img src={src} alt={alt} className="h-40 w-full object-cover transition hover:scale-105" />
    </a>
  );
}

const ADMIN_STATUSES = [
  'PENDING_CALL',
  'CALL_COMPLETED',
  'CONFIRMED_FOR_DELIVERY',
  'ASSIGNED',
  'IN_ROUTE',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'NOT_DELIVERED',
  'CANCELLED',
  'RETURNED',
  'RESCHEDULED',
];

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const { data: delivery, refetch, isLoading } = useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => (await deliveriesApi.getById(id!)).data.data as DeliveryDTO,
    enabled: !!id,
  });

  const { data: evidence } = useQuery({
    queryKey: ['delivery-evidence', id],
    queryFn: async () => {
      const res = await evidenceApi.listByDelivery(id!);
      return res.data.data as Array<{
        id: string;
        type: string;
        fileName: string;
        createdAt: string;
        uploadedBy: { firstName: string; lastName: string };
      }>;
    },
    enabled: !!id,
  });

  const { data: incidents } = useQuery({
    queryKey: ['delivery-incidents', id],
    queryFn: async () => {
      const res = await incidentsApi.listByDelivery(id!);
      return res.data.data as Array<{
        id: string;
        type: string;
        description: string;
        createdAt: string;
        reportedBy: { firstName: string; lastName: string };
      }>;
    },
    enabled: !!id,
  });

  const { data: statusHistory } = useQuery({
    queryKey: ['delivery-status-history', id],
    queryFn: async () => {
      const res = await deliveryStatusApi.getHistory(id!);
      return res.data.data as Array<{
        id: string;
        fromStatus: string | null;
        toStatus: string;
        action: string;
        observations: string | null;
        createdAt: string;
        changedBy: { firstName: string; lastName: string };
      }>;
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      deliveriesApi.updateStatus(id!, {
        status: newStatus,
        observations: statusNotes || undefined,
      }),
    onSuccess: () => {
      refetch();
      setStatusNotes('');
      toast.success('Estado de entrega actualizado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar el estado')),
  });

  useEffect(() => {
    if (delivery?.status) setNewStatus(delivery.status);
  }, [delivery?.status]);

  if (isLoading || !delivery) return <p>Cargando entrega...</p>;

  const photos = (evidence || []).filter((e) => e.type === 'PHOTO');

  return (
    <div className="space-y-6">
      <Link to="/deliveries" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a entregas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-bold">{delivery.deliveryNumber}</h2>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status}
        </span>
        <span className="text-sm text-muted-foreground">
          {PRIORITY_LABELS[delivery.priority] || delivery.priority}
        </span>
      </div>

      {(delivery.observations || delivery.failureReason) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h4 className="mb-2 font-semibold">Observaciones del domiciliario</h4>
          {delivery.observations && <p className="text-sm">{delivery.observations}</p>}
          {delivery.failureReason && (
            <p className="mt-2 text-sm text-muted-foreground">
              Motivo no entrega: {delivery.failureReason}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h4 className="mb-2 font-semibold">Paciente</h4>
          <p>{delivery.patient.firstName} {delivery.patient.lastName}</p>
          <p className="text-sm text-muted-foreground">Doc: {delivery.patient.documentId}</p>
          <p className="text-sm">{delivery.patient.phone}</p>
          <p className="text-sm">{delivery.patient.address}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h4 className="mb-2 font-semibold">Medicamentos</h4>
          {delivery.items.map((item) => (
            <p key={item.id} className="text-sm">{item.medication.name} x{item.quantity}</p>
          ))}
          {delivery.assignment && (
            <p className="mt-3 text-sm">
              Domiciliario: {delivery.assignment.courier.firstName} {delivery.assignment.courier.lastName}
            </p>
          )}
        </div>
      </div>

      <PermissionGate permissions={['deliveries.write']}>
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-semibold">Cambiar estado (administrador)</h4>
          <div className="flex flex-wrap gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="min-w-52 rounded-md border px-3 py-2 text-sm"
            >
              {ADMIN_STATUSES.map((s) => (
                <option key={s} value={s}>{DELIVERY_STATUS_LABELS[s] || s}</option>
              ))}
            </select>
            <input
              className="min-w-64 flex-1 rounded-md border px-3 py-2 text-sm"
              placeholder="Observaciones (opcional)"
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
            />
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              disabled={!newStatus || newStatus === delivery.status || statusMutation.isPending}
              onClick={() => statusMutation.mutate()}
            >
              {statusMutation.isPending ? 'Guardando...' : 'Actualizar estado'}
            </button>
          </div>
        </div>
      </PermissionGate>

      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-semibold">Evidencia fotográfica ({photos.length})</h4>
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay fotografías registradas para esta entrega.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <div key={photo.id}>
                <EvidencePhoto evidenceId={photo.id} alt={photo.fileName} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {photo.uploadedBy.firstName} {photo.uploadedBy.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(photo.createdAt).toLocaleString('es-CO')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-semibold">Incidencias ({(incidents || []).length})</h4>
        {(incidents || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay incidencias registradas.</p>
        ) : (
          <div className="space-y-3">
            {(incidents || []).map((incident) => (
              <div key={incident.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {INCIDENT_LABELS[incident.type] || incident.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(incident.createdAt).toLocaleString('es-CO')}
                  </span>
                </div>
                <p className="mt-2">{incident.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reportado por {incident.reportedBy.firstName} {incident.reportedBy.lastName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4">
        <h4 className="mb-3 font-semibold">Historial de estados</h4>
        {(statusHistory || []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin cambios de estado registrados.</p>
        ) : (
          <div className="space-y-2">
            {(statusHistory || []).map((log) => (
              <div key={log.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {log.fromStatus && (
                    <>
                      <span>{DELIVERY_STATUS_LABELS[log.fromStatus] || log.fromStatus}</span>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <span className="font-medium">
                    {DELIVERY_STATUS_LABELS[log.toStatus] || log.toStatus}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString('es-CO')}
                  </span>
                </div>
                {log.observations && (
                  <p className="mt-2 text-muted-foreground">{log.observations}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {log.changedBy.firstName} {log.changedBy.lastName}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
