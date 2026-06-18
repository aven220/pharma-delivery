import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea, Select } from '@/components/ui/textarea';
import { Phone, Save, Search, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';
import { CallNotificationBell } from '@/components/calls/CallNotificationBell';
import {
  CALL_QUEUE_STATUS_LABELS,
  CALL_MANAGEMENT_LABELS,
  CALL_CATEGORY_LABELS,
  DELIVERY_STATUS_LABELS,
  formatPatientName,
  getCallCategory,
  getDeliveryCallLockMessage,
  isDeliveryCallLocked,
  type CallCategoryId,
} from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

const CALL_STATUSES = Object.entries(CALL_QUEUE_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const MANAGEMENT_RESULTS = Object.entries(CALL_MANAGEMENT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface CallAssignment {
  id: string;
  status: string;
  managementResult?: string | null;
  observations: string | null;
  callDate?: string | null;
  callTime?: string | null;
  delivery: {
    id: string;
    deliveryNumber: string;
    documentNumber?: string | null;
    status: string;
    deliveredAt?: string | null;
    observations: string | null;
    patient: {
      id: string;
      firstName: string;
      lastName: string;
      documentId: string;
      documentType: string;
      address: string;
      neighborhood: string | null;
      city: string | null;
      addressDetail: string | null;
      phone: string | null;
      phoneAlt: string | null;
      phoneFamily: string | null;
      phoneAlternative: string | null;
      notes: string | null;
    };
    callHistory: Array<{ observations: string | null; calledAt: string }>;
    items?: Array<{
      id: string;
      quantity: number;
      lotNumber?: string | null;
      medication: { name: string; code: string; cum?: string | null };
    }>;
    evidence?: Array<{ id: string; fileName: string; type: string; createdAt: string }>;
    assignments?: Array<{
      courier?: { firstName: string; lastName: string } | null;
      route?: { routeDate: string } | null;
      intermunicipalRoute?: { routeCode: string; routeDate: string } | null;
    }>;
  };
}

function formatMedicationLine(item: NonNullable<CallAssignment['delivery']['items']>[number]) {
  const parts = [`${item.medication.name} × ${item.quantity}`];
  if (item.medication.cum) parts.push(`CUM ${item.medication.cum}`);
  else if (item.medication.code) parts.push(item.medication.code);
  if (item.lotNumber) parts.push(`Lote ${item.lotNumber}`);
  return parts.join(' · ');
}

function medicationsSummary(items?: CallAssignment['delivery']['items']) {
  if (!items?.length) return 'Sin medicamentos';
  return items.map((i) => `${i.medication.name} ×${i.quantity}`).join(', ');
}

function getRouteLabel(delivery: CallAssignment['delivery']) {
  const assignment = delivery.assignments?.[0];
  if (assignment?.intermunicipalRoute) return assignment.intermunicipalRoute.routeCode;
  if (assignment?.route) {
    return `Ruta urbana ${new Date(assignment.route.routeDate).toLocaleDateString('es-CO')}`;
  }
  return '—';
}

function getCourierName(delivery: CallAssignment['delivery']) {
  const courier = delivery.assignments?.[0]?.courier;
  return courier ? `${courier.firstName} ${courier.lastName}` : '—';
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-CO');
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO');
}

const EMPTY_FORM = {
  status: 'PENDING',
  managementResult: '',
  observations: '',
  callDate: '',
  callTime: '',
  durationSec: '',
  phoneUsed: '',
  address: '',
  neighborhood: '',
  city: '',
  addressDetail: '',
  phone: '',
  phoneAlt: '',
  phoneFamily: '',
  phoneAlternative: '',
  rescheduleDate: '',
  rescheduleTime: '',
  action: '',
  deactivationReason: '',
  pendingSubreason: '',
};

function buildFormFromCall(call: CallAssignment) {
  const p = call.delivery.patient;
  return {
    ...EMPTY_FORM,
    status: call.status,
    observations: call.observations || '',
    callDate: new Date().toISOString().slice(0, 10),
    callTime: new Date().toTimeString().slice(0, 5),
    phoneUsed: p.phone || '',
    address: p.address,
    neighborhood: p.neighborhood || '',
    city: p.city || '',
    addressDetail: p.addressDetail || '',
    phone: p.phone || '',
    phoneAlt: p.phoneAlt || '',
    phoneFamily: p.phoneFamily || '',
    phoneAlternative: p.phoneAlternative || '',
  };
}

const CATEGORY_ORDER: CallCategoryId[] = [
  'pending',
  'in_management',
  'confirmed',
  'rescheduled',
  'deactivated',
  'delivered',
];

export function MyCallsPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CallCategoryId>('pending');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: calls, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['my-calls'],
    queryFn: async () => {
      const res = await callsApi.myCalls({ limit: 100 });
      return res.data.data as CallAssignment[];
    },
    refetchInterval: 30000,
  });

  const handleRefresh = () => {
    void refetch();
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<CallCategoryId, number> = {
      pending: 0,
      in_management: 0,
      confirmed: 0,
      rescheduled: 0,
      deactivated: 0,
      delivered: 0,
    };
    for (const call of calls || []) {
      counts[getCallCategory(call)] += 1;
    }
    return counts;
  }, [calls]);

  const filteredCalls = useMemo(() => {
    if (!calls) return [];
    let list = calls.filter((c) => getCallCategory(c) === activeCategory);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((c) => {
      const p = c.delivery.patient;
      const docNumber = c.delivery.documentNumber || '';
      return (
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
        c.delivery.deliveryNumber.toLowerCase().includes(q) ||
        p.documentId.includes(q) ||
        docNumber.toLowerCase().includes(q)
      );
    });
  }, [calls, search, activeCategory]);

  useEffect(() => {
    setSelectedId(null);
  }, [activeCategory]);

  const selected = filteredCalls.find((c) => c.id === selectedId) || filteredCalls[0];

  const loadCall = (call: CallAssignment) => {
    setSelectedId(call.id);
    setForm(buildFormFromCall(call));
    setSaveMessage(null);
  };

  useEffect(() => {
    if (filteredCalls.length > 0 && !selectedId) {
      setSelectedId(filteredCalls[0].id);
      setForm(buildFormFromCall(filteredCalls[0]));
    }
  }, [filteredCalls, selectedId]);

  const updateMutation = useMutation({
    mutationFn: () =>
      callsApi.updateMyCall(selected!.id, {
        status: form.status,
        managementResult: form.managementResult || undefined,
        observations: form.observations || undefined,
        callDate: form.callDate || undefined,
        callTime: form.callTime || undefined,
        durationSec: form.durationSec ? Number(form.durationSec) : undefined,
        phoneUsed: form.phoneUsed || undefined,
        rescheduleDate: form.rescheduleDate || undefined,
        rescheduleTime: form.rescheduleTime || undefined,
        action: form.action || undefined,
        deactivationReason: form.deactivationReason || undefined,
        pendingSubreason: form.pendingSubreason || undefined,
        patientUpdates: {
          address: form.address || undefined,
          neighborhood: form.neighborhood || undefined,
          city: form.city || undefined,
          addressDetail: form.addressDetail || undefined,
          phone: form.phone || undefined,
          phoneAlt: form.phoneAlt || undefined,
          phoneFamily: form.phoneFamily || undefined,
          phoneAlternative: form.phoneAlternative || undefined,
        },
      }),
    onSuccess: async () => {
      const savedId = selected!.id;
      setSaveMessage('Gestión guardada correctamente');
      toast.success('Gestión guardada correctamente');
      setForm(EMPTY_FORM);

      const fresh = await queryClient.fetchQuery({
        queryKey: ['my-calls'],
        queryFn: async () => {
          const res = await callsApi.myCalls({ limit: 100 });
          return res.data.data as CallAssignment[];
        },
      });

      const list = fresh ?? [];
      const next = list.find((c) => c.id !== savedId) ?? list[0];
      if (next) {
        setSelectedId(next.id);
        setForm(buildFormFromCall(next));
      } else {
        setSelectedId(null);
      }

      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo guardar la gestión')),
  });

  if (isLoading) return <div>Cargando...</div>;

  const phones = selected
    ? [
        { label: 'Principal', value: selected.delivery.patient.phone },
        { label: 'Secundario', value: selected.delivery.patient.phoneAlt },
        { label: 'Familiar', value: selected.delivery.patient.phoneFamily },
        { label: 'Alternativo', value: selected.delivery.patient.phoneAlternative },
      ].filter((p) => p.value)
    : [];

  const isLocked = selected ? isDeliveryCallLocked(selected.delivery.status) : false;
  const lockMessage = selected ? getDeliveryCallLockMessage(selected.delivery.status) : null;
  const isDeliveredTab = activeCategory === 'delivered';

  return (
    <div className="space-y-6">
      {!embedded ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Mis Llamadas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cada fila es una <strong>entrega / orden</strong> (NroDocumento), no el paciente completo.
              Un mismo paciente puede tener varias entregas activas a la vez.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CallNotificationBell />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <CallNotificationBell />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      )}

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          <CheckCircle2 className="h-5 w-5" />
          {saveMessage} — Formulario listo para la siguiente gestión.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={activeCategory === category ? 'default' : 'outline'}
            onClick={() => setActiveCategory(category)}
          >
            {CALL_CATEGORY_LABELS[category]} ({categoryCounts[category]})
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {CALL_CATEGORY_LABELS[activeCategory]} ({filteredCalls.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar entrega, NroDocumento, paciente o cédula..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isDeliveredTab ? (
              <div className="max-h-[560px] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 text-left">
                    <tr>
                      <th className="p-2">Paciente</th>
                      <th className="p-2">NroDocumento</th>
                      <th className="p-2">F. llamada</th>
                      <th className="p-2">F. entrega</th>
                      <th className="p-2">Domiciliario</th>
                      <th className="p-2">Ruta</th>
                      <th className="p-2">Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.map((call) => (
                      <tr
                        key={call.id}
                        className={`cursor-pointer border-t hover:bg-muted/50 ${
                          selected?.id === call.id ? 'bg-muted/50' : ''
                        }`}
                        onClick={() => loadCall(call)}
                      >
                        <td className="p-2">
                          {formatPatientName(call.delivery.patient)}
                          <div className="text-xs text-muted-foreground">{call.delivery.deliveryNumber}</div>
                          <div className="text-xs text-muted-foreground">{medicationsSummary(call.delivery.items)}</div>
                        </td>
                        <td className="p-2">{call.delivery.documentNumber || '—'}</td>
                        <td className="p-2">{formatDate(call.callDate)}</td>
                        <td className="p-2">{formatDate(call.delivery.deliveredAt)}</td>
                        <td className="p-2">{getCourierName(call.delivery)}</td>
                        <td className="p-2">{getRouteLabel(call.delivery)}</td>
                        <td className="p-2">
                          {(call.delivery.evidence?.length ?? 0) > 0
                            ? `${call.delivery.evidence!.length} archivo(s)`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredCalls.length === 0 && (
                  <p className="p-4 text-sm text-muted-foreground">No hay entregas completadas en su bandeja.</p>
                )}
              </div>
            ) : (
            <div className="max-h-[560px] space-y-2 overflow-auto">
              {filteredCalls.map((call) => (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => loadCall(call)}
                  className={`w-full rounded-md border p-3 text-left text-sm hover:bg-muted ${
                    selected?.id === call.id ? 'border-primary bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">
                      {formatPatientName(call.delivery.patient)}
                    </div>
                    <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs">
                      {DELIVERY_STATUS_LABELS[call.delivery.status] || call.delivery.status}
                    </span>
                  </div>
                  <div className="text-muted-foreground">
                    Entrega {call.delivery.deliveryNumber}
                    {call.delivery.documentNumber ? ` · Doc. ${call.delivery.documentNumber}` : ''}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {medicationsSummary(call.delivery.items)}
                  </div>
                  <div className="text-muted-foreground">
                    {CALL_QUEUE_STATUS_LABELS[call.status] || call.status}
                  </div>
                </button>
              ))}
              {filteredCalls.length === 0 && (
                <p className="text-sm text-muted-foreground">No tiene llamadas asignadas.</p>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        {selected && (
          <div className="space-y-4">
            {lockMessage && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {lockMessage}
              </div>
            )}

            <Card>
              <CardHeader><CardTitle>Entrega / orden</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Número entrega:</strong> {selected.delivery.deliveryNumber}</p>
                <p><strong>Dispensación (NroDocumento):</strong> {selected.delivery.documentNumber || '—'}</p>
                <p><strong>Estado entrega:</strong> {DELIVERY_STATUS_LABELS[selected.delivery.status] || selected.delivery.status}</p>
                <p><strong>Paciente:</strong> {selected.delivery.patient.documentType} {selected.delivery.patient.documentId} — {formatPatientName(selected.delivery.patient)}</p>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                  <p className="font-semibold text-primary">Medicamentos de esta orden</p>
                  <p className="text-xs text-muted-foreground">Ofrezca estos medicamentos al paciente en la llamada</p>
                  {(selected.delivery.items?.length ?? 0) > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {selected.delivery.items!.map((item) => (
                        <li key={item.id} className="font-medium">
                          {formatMedicationLine(item)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-muted-foreground">No hay medicamentos registrados en esta orden.</p>
                  )}
                </div>
                {isDeliveredTab && (
                  <>
                    <p><strong>Fecha llamada:</strong> {formatDateTime(selected.callDate)}</p>
                    <p><strong>Fecha entrega:</strong> {formatDateTime(selected.delivery.deliveredAt)}</p>
                    <p><strong>Domiciliario:</strong> {getCourierName(selected.delivery)}</p>
                    <p><strong>Ruta:</strong> {getRouteLabel(selected.delivery)}</p>
                    <p><strong>Evidencia:</strong> {(selected.delivery.evidence?.length ?? 0) > 0 ? `${selected.delivery.evidence!.length} archivo(s)` : 'Sin evidencia'}</p>
                    <Link
                      to={`/deliveries/${selected.delivery.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver detalle de entrega
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {!isDeliveredTab && (
            <>
            <Card>
              <CardHeader><CardTitle>Datos del paciente</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Documento:</strong> {selected.delivery.patient.documentType} {selected.delivery.patient.documentId}</p>
                <p><strong>Dirección:</strong> {selected.delivery.patient.address}</p>
                <p><strong>Observaciones previas:</strong> {selected.delivery.observations || selected.delivery.patient.notes || '—'}</p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {phones.map((ph) => (
                    <a
                      key={ph.label}
                      href={`tel:${ph.value}`}
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
                      onClick={() => setForm((f) => ({ ...f, phoneUsed: ph.value! }))}
                    >
                      <Phone className="h-3 w-3" />
                      {ph.label}: {ph.value}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Gestión de llamada</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Estado llamada</Label>
                    <Select value={form.status} disabled={isLocked} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {CALL_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Resultado gestión</Label>
                    <Select
                      value={form.managementResult}
                      disabled={isLocked}
                      onChange={(e) => setForm({ ...form, managementResult: e.target.value })}
                    >
                      <option value="">— Seleccionar —</option>
                      {MANAGEMENT_RESULTS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Fecha llamada</Label>
                    <Input type="date" disabled={isLocked} value={form.callDate} onChange={(e) => setForm({ ...form, callDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Hora llamada</Label>
                    <Input type="time" disabled={isLocked} value={form.callTime} onChange={(e) => setForm({ ...form, callTime: e.target.value })} />
                  </div>
                  <div>
                    <Label>Duración (seg)</Label>
                    <Input type="number" disabled={isLocked} value={form.durationSec} onChange={(e) => setForm({ ...form, durationSec: e.target.value })} />
                  </div>
                  <div>
                    <Label>Teléfono usado</Label>
                    <Input disabled={isLocked} value={form.phoneUsed} onChange={(e) => setForm({ ...form, phoneUsed: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Observaciones</Label>
                  <Textarea disabled={isLocked} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Actualizar datos paciente</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Dirección</Label>
                  <Input disabled={isLocked} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>Barrio</Label>
                  <Input disabled={isLocked} value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                </div>
                <div>
                  <Label>Ciudad</Label>
                  <Input disabled={isLocked} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Referencia</Label>
                  <Input disabled={isLocked} value={form.addressDetail} onChange={(e) => setForm({ ...form, addressDetail: e.target.value })} />
                </div>
                <div>
                  <Label>Tel. principal</Label>
                  <Input disabled={isLocked} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Tel. secundario</Label>
                  <Input disabled={isLocked} value={form.phoneAlt} onChange={(e) => setForm({ ...form, phoneAlt: e.target.value })} />
                </div>
                <div>
                  <Label>Tel. familiar</Label>
                  <Input disabled={isLocked} value={form.phoneFamily} onChange={(e) => setForm({ ...form, phoneFamily: e.target.value })} />
                </div>
                <div>
                  <Label>Tel. alternativo</Label>
                  <Input disabled={isLocked} value={form.phoneAlternative} onChange={(e) => setForm({ ...form, phoneAlternative: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Acciones operativas</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Acción</Label>
                  <Select value={form.action} disabled={isLocked} onChange={(e) => setForm({ ...form, action: e.target.value })}>
                    <option value="">— Ninguna —</option>
                    <option value="CONFIRM">Confirmar entrega</option>
                    <option value="PENDING">Marcar pendiente</option>
                    <option value="DEACTIVATE">Dar de baja</option>
                    <option value="RESCHEDULE">Reagendar</option>
                  </Select>
                </div>
                {form.action === 'DEACTIVATE' && (
                  <div>
                    <Label>Motivo de baja *</Label>
                    <Select value={form.deactivationReason} disabled={isLocked} onChange={(e) => setForm({ ...form, deactivationReason: e.target.value })}>
                      <option value="">Seleccionar</option>
                      <option value="PATIENT_DECEASED">Paciente fallecido</option>
                      <option value="WRONG_ADDRESS">Dirección incorrecta</option>
                      <option value="WRONG_NUMBER">Número incorrecto</option>
                      <option value="TREATMENT_REJECTED">Paciente rechaza tratamiento</option>
                      <option value="MEDICATION_SUSPENDED">Medicamento suspendido</option>
                      <option value="EPS_CANCELLED">EPS canceló servicio</option>
                      <option value="DUPLICATE">Duplicado</option>
                      <option value="LOAD_ERROR">Error de carga</option>
                      <option value="NOT_LOCATED">No localizado</option>
                      <option value="OTHER">Otro</option>
                    </Select>
                  </div>
                )}
                {form.action === 'PENDING' && (
                  <div>
                    <Label>Submotivo pendiente *</Label>
                    <Select value={form.pendingSubreason} disabled={isLocked} onChange={(e) => setForm({ ...form, pendingSubreason: e.target.value })}>
                      <option value="">Seleccionar</option>
                      <option value="NO_ANSWER">No contestó</option>
                      <option value="PHONE_OFF">Teléfono apagado</option>
                      <option value="RESCHEDULE_CALL">Reagendar llamada</option>
                      <option value="PENDING_AUTHORIZATION">Pendiente autorización</option>
                      <option value="PENDING_VALIDATION">Pendiente validación</option>
                      <option value="PENDING_ADDRESS">Pendiente dirección</option>
                      <option value="OTHER">Otro</option>
                    </Select>
                  </div>
                )}
                {form.action === 'RESCHEDULE' && (
                  <>
                    <div>
                      <Label>Fecha reagendar</Label>
                      <Input type="date" disabled={isLocked} value={form.rescheduleDate} onChange={(e) => setForm({ ...form, rescheduleDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Hora reagendar</Label>
                      <Input disabled={isLocked} value={form.rescheduleTime} onChange={(e) => setForm({ ...form, rescheduleTime: e.target.value })} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                disabled={isLocked || updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar gestión'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLocked}
                onClick={() => setForm(buildFormFromCall(selected))}
              >
                Restablecer
              </Button>
            </div>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
