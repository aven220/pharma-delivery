import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { pendingPrepApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DELIVERY_STATUS_LABELS, PRIORITY_LABELS, formatPatientName } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { Package, PackageCheck, PackageX, Search } from 'lucide-react';

type PrepStatus = 'LIBRE' | 'EMPACADO' | 'RECHAZADO' | '';
type DialogMode = 'pack' | 'reject' | null;

type DeliveryRow = {
  id: string;
  deliveryNumber: string;
  documentNumber?: string | null;
  status: string;
  priority: string;
  pendingGeneratedAt?: string | null;
  patient: {
    documentId: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
    phoneAlt?: string | null;
    phoneFamily?: string | null;
    address?: string;
    city?: string | null;
    neighborhood?: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    lotNumber?: string | null;
    medication: { code: string; cum?: string | null; name: string };
  }>;
  statusLogs?: Array<{ observations?: string | null }>;
};

const EMPTY_CONTACT = {
  phone: '',
  phoneAlt: '',
  phoneFamily: '',
  address: '',
  city: '',
  neighborhood: '',
};

const TABS: Array<{ id: PrepStatus; label: string }> = [
  { id: 'LIBRE', label: 'Libres' },
  { id: 'EMPACADO', label: 'Empacados' },
  { id: 'RECHAZADO', label: 'Rechazados' },
  { id: '', label: 'Todos' },
];

export function PendingPrepPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PrepStatus>('LIBRE');
  const [search, setSearch] = useState('');
  const [activeDelivery, setActiveDelivery] = useState<DeliveryRow | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [lotInputs, setLotInputs] = useState<Record<string, string>>({});
  const [packObs, setPackObs] = useState('');
  const [rejectObs, setRejectObs] = useState('');
  const [contactForm, setContactForm] = useState(EMPTY_CONTACT);

  const { data: summary } = useQuery({
    queryKey: ['pending-prep-summary'],
    queryFn: async () => (await pendingPrepApi.summary()).data.data,
    refetchInterval: 15000,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ['pending-prep', status, search],
    queryFn: async () =>
      (await pendingPrepApi.list({ status: status || undefined, search: search || undefined, limit: 100 }))
        .data.data as DeliveryRow[],
    refetchInterval: 15000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-prep'] });
    queryClient.invalidateQueries({ queryKey: ['pending-prep-summary'] });
    queryClient.invalidateQueries({ queryKey: ['calls-pending'] });
  };

  const openPack = (delivery: DeliveryRow) => {
    setActiveDelivery(delivery);
    setDialogMode('pack');
    setLotInputs({});
    setPackObs('');
    setRejectObs('');
    setContactForm({
      phone: delivery.patient.phone || '',
      phoneAlt: delivery.patient.phoneAlt || '',
      phoneFamily: delivery.patient.phoneFamily || '',
      address: delivery.patient.address || '',
      city: delivery.patient.city || '',
      neighborhood: delivery.patient.neighborhood || '',
    });
  };

  const openReject = (delivery: DeliveryRow) => {
    setActiveDelivery(delivery);
    setDialogMode('reject');
    setRejectObs('');
  };

  const closeDialog = () => {
    setActiveDelivery(null);
    setDialogMode(null);
  };

  const packMutation = useMutation({
    mutationFn: () => {
      if (!activeDelivery) throw new Error('Sin entrega');
      return pendingPrepApi.pack(activeDelivery.id, {
        observations: packObs || undefined,
        items: activeDelivery.items.map((item) => ({
          itemId: item.id,
          lotNumber: lotInputs[item.id] || undefined,
        })),
        patientUpdates: contactForm,
      });
    },
    onSuccess: () => {
      toast.success('Paquete empacado — listo para llamadas');
      closeDialog();
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo empacar')),
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!activeDelivery) throw new Error('Sin entrega');
      return pendingPrepApi.reject(activeDelivery.id, rejectObs);
    },
    onSuccess: () => {
      toast.success('Paquete rechazado');
      closeDialog();
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo rechazar')),
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => pendingPrepApi.reopen(id),
    onSuccess: () => {
      toast.success('Paquete reabierto como Libre');
      invalidate();
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'No se pudo reabrir')),
  });

  const counts = useMemo(() => {
    const map = Object.fromEntries(
      (summary?.byStatus || []).map((s: { status: string; count: number }) => [s.status, s.count])
    );
    return { libre: map.LIBRE || 0, empacado: map.EMPACADO || 0, rechazado: map.RECHAZADO || 0 };
  }, [summary]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Preparación de pendientes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Importación → <strong>Libre</strong> → encargado empaca (lote opcional) → <strong>Empacado</strong> →
          llamadas. Rechazo exige observación obligatoria.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Libres</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">{counts.libre} <Package className="h-5 w-5" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Empacados</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">{counts.empacado} <PackageCheck className="h-5 w-5 text-green-600" /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Rechazados</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-bold">{counts.rechazado} <PackageX className="h-5 w-5 text-red-600" /></CardContent>
        </Card>
      </div>

      {(summary?.byDispensacion?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle>Pendientes por dispensación</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(summary.byDispensacion as Array<{ documentNumber: string; count: number }>).slice(0, 15).map((d) => (
              <span key={d.documentNumber} className="rounded-md border px-3 py-1 text-sm">
                {d.documentNumber}: <strong>{d.count}</strong>
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button key={tab.id || 'all'} size="sm" variant={status === tab.id ? 'default' : 'outline'} onClick={() => setStatus(tab.id)}>
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cédula, dispensación, CUM..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="space-y-3">
          {(list || []).map((delivery) => (
            <Card key={delivery.id}>
              <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:justify-between">
                <div>
                  <p className="font-semibold">
                    {formatPatientName(delivery.patient)} · CC {delivery.patient.documentId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Dispensación {delivery.documentNumber || '—'} · {delivery.deliveryNumber} ·{' '}
                    {PRIORITY_LABELS[delivery.priority]}
                    {delivery.pendingGeneratedAt
                      ? ` · Pendiente ${new Date(delivery.pendingGeneratedAt).toLocaleDateString('es-CO')}`
                      : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {delivery.patient.phone || 'Sin tel.'}
                    {delivery.patient.phoneAlt ? ` · ${delivery.patient.phoneAlt}` : ''}
                    {delivery.patient.phoneFamily ? ` · ${delivery.patient.phoneFamily}` : ''}
                  </p>
                  <ul className="mt-1 text-sm">
                    {delivery.items.map((item) => (
                      <li key={item.id}>
                        {item.medication.name} × {item.quantity}
                        {item.lotNumber ? ` · Lote ${item.lotNumber}` : ''}
                      </li>
                    ))}
                  </ul>
                  {delivery.status === 'RECHAZADO' && delivery.statusLogs?.[0]?.observations && (
                    <p className="mt-1 text-sm text-red-600">{delivery.statusLogs[0].observations}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded bg-muted px-2 py-1 text-xs">{DELIVERY_STATUS_LABELS[delivery.status]}</span>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" asChild><Link to={`/deliveries/${delivery.id}`}>Detalle</Link></Button>
                    {delivery.status === 'LIBRE' && (
                      <>
                        <Button size="sm" onClick={() => openPack(delivery)}>Empacar</Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => openReject(delivery)}>Rechazar</Button>
                      </>
                    )}
                    {delivery.status === 'RECHAZADO' && (
                      <Button size="sm" variant="outline" onClick={() => reopenMutation.mutate(delivery.id)}>Reabrir</Button>
                    )}
                    {delivery.status === 'EMPACADO' && (
                      <Button size="sm" variant="outline" asChild><Link to="/calls?tab=pending">Llamadas</Link></Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {(list || []).length === 0 && <p className="text-muted-foreground">No hay pendientes.</p>}
        </div>
      )}

      {activeDelivery && dialogMode === 'pack' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <CardHeader><CardTitle>Empacar {activeDelivery.documentNumber}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Puede corregir teléfonos y dirección antes de empacar. El lote es opcional.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Teléfono 1</Label><Input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} /></div>
                <div><Label>Teléfono 2</Label><Input value={contactForm.phoneAlt} onChange={(e) => setContactForm((p) => ({ ...p, phoneAlt: e.target.value }))} /></div>
                <div><Label>Teléfono 3</Label><Input value={contactForm.phoneFamily} onChange={(e) => setContactForm((p) => ({ ...p, phoneFamily: e.target.value }))} /></div>
                <div className="sm:col-span-2"><Label>Dirección</Label><Input value={contactForm.address} onChange={(e) => setContactForm((p) => ({ ...p, address: e.target.value }))} /></div>
                <div><Label>Barrio</Label><Input value={contactForm.neighborhood} onChange={(e) => setContactForm((p) => ({ ...p, neighborhood: e.target.value }))} /></div>
                <div><Label>Ciudad</Label><Input value={contactForm.city} onChange={(e) => setContactForm((p) => ({ ...p, city: e.target.value }))} /></div>
              </div>
              {activeDelivery.items.map((item) => (
                <div key={item.id}>
                  <Label>{item.medication.name} × {item.quantity}</Label>
                  <Input placeholder="Lote (opcional)" value={lotInputs[item.id] || ''} onChange={(e) => setLotInputs((p) => ({ ...p, [item.id]: e.target.value }))} />
                </div>
              ))}
              <div>
                <Label>Observaciones</Label>
                <Textarea value={packObs} onChange={(e) => setPackObs(e.target.value)} rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => packMutation.mutate()} disabled={packMutation.isPending}>Confirmar empacado</Button>
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeDelivery && dialogMode === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader><CardTitle>Rechazar paquete</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Label>Observación obligatoria</Label>
              <Textarea value={rejectObs} onChange={(e) => setRejectObs(e.target.value)} rows={3} />
              <div className="flex gap-2">
                <Button variant="outline" className="border-red-300 text-red-600" disabled={!rejectObs.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>Confirmar rechazo</Button>
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
