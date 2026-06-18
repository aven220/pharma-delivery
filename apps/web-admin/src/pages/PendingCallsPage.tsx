import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { callsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/textarea';
import { Search } from 'lucide-react';
import { DELIVERY_STATUS_LABELS, formatPatientName } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

export function PendingCallsPage({ embedded = false }: { embedded?: boolean }) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operatorId, setOperatorId] = useState('');
  const [search, setSearch] = useState('');

  const { data: pending, isLoading } = useQuery({
    queryKey: ['calls-pending', search],
    queryFn: async () => (await callsApi.pending({ limit: 100, search: search || undefined })).data.data,
  });

  const { data: operators } = useQuery({
    queryKey: ['call-operators'],
    queryFn: async () => (await callsApi.operators()).data.data,
  });

  const assignMutation = useMutation({
    mutationFn: () => callsApi.assign({ deliveryIds: selectedIds, operatorUserId: operatorId }),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['calls-pending'] });
      toast.success('Llamadas asignadas correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudieron asignar las llamadas')),
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (isLoading) return <div>Cargando...</div>;

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6'}>
      {!embedded && (
        <div>
          <h2 className="text-3xl font-bold">Llamadas Pendientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Solo entregas <strong>empacadas</strong> pueden asignarse. Cada fila es una dispensación (NroDispensacion).
          </p>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Asignar a operador</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Select value={operatorId} onChange={(e) => setOperatorId(e.target.value)} className="min-w-48">
            <option value="">Seleccionar operador</option>
            {(operators || []).map((op: { id: string; firstName: string; lastName: string }) => (
              <option key={op.id} value={op.id}>{op.firstName} {op.lastName}</option>
            ))}
          </Select>
          <Button
            disabled={!operatorId || selectedIds.length === 0 || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
          >
            Asignar {selectedIds.length} llamada(s)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bandeja ({pending?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Buscar entrega, NroDocumento, paciente, cédula o teléfono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Sin operador primero · Con operador asignado al final
          </p>
          <div className="space-y-3">
            {(pending || []).map((item: {
              id: string;
              deliveryNumber: string;
              documentNumber?: string | null;
              status: string;
              createdAt: string;
              observations: string | null;
              patient: {
                firstName: string;
                lastName: string;
                documentId: string;
                documentType: string;
                address: string;
                phone: string | null;
                phoneAlt: string | null;
              };
              medications: Array<{ name: string; quantity: number }>;
              assignedOperator: { firstName: string; lastName: string } | null;
            }) => (
              <label
                key={item.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-4 hover:bg-muted/50 ${
                  item.assignedOperator ? 'opacity-75' : ''
                }`}
              >
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    Entrega {item.deliveryNumber}
                    {item.documentNumber ? ` · Doc. ${item.documentNumber}` : ''}
                  </div>
                  <div className="font-medium text-foreground/90">
                    {formatPatientName(item.patient)}
                  </div>
                  <div className="text-muted-foreground">
                    Cédula {item.patient.documentType} {item.patient.documentId} · {item.patient.address}
                  </div>
                  <div className="text-muted-foreground">
                    Tel: {item.patient.phone || '—'} · Alt: {item.patient.phoneAlt || '—'}
                  </div>
                  <div className="text-muted-foreground">
                    Medicamentos: {item.medications.map((m) => `${m.name} x${m.quantity}`).join(', ') || '—'}
                  </div>
                  <div className="text-muted-foreground">
                    Creado: {new Date(item.createdAt).toLocaleString('es-CO')} ·{' '}
                    {DELIVERY_STATUS_LABELS[item.status] || item.status}
                  </div>
                  {item.observations && <div>Obs: {item.observations}</div>}
                  {item.assignedOperator ? (
                    <div className="font-medium text-amber-700">
                      Operador asignado: {item.assignedOperator.firstName} {item.assignedOperator.lastName}
                    </div>
                  ) : (
                    <div className="text-emerald-700">Sin operador — disponible para asignar</div>
                  )}
                </div>
              </label>
            ))}
            {(!pending || pending.length === 0) && (
              <p className="text-sm text-muted-foreground">No hay llamadas pendientes.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
