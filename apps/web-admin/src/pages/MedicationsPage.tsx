import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicationsApi } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import { Pencil, FileSpreadsheet } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { usePermissions } from '@/hooks/usePermissions';

const EMPTY_FORM = {
  cum: '',
  code: '',
  name: '',
  laboratory: '',
  presentation: '',
  concentration: '',
  status: 'ACTIVE',
};

type MedicationRow = {
  id: string;
  cum: string | null;
  code: string;
  name: string;
  laboratory: string | null;
  presentation: string | null;
  concentration: string | null;
  status: string;
};

function medicationToForm(m: MedicationRow) {
  return {
    cum: m.cum || '',
    code: m.code,
    name: m.name,
    laboratory: m.laboratory || '',
    presentation: m.presentation || '',
    concentration: m.concentration || '',
    status: m.status,
  };
}

export function MedicationsPage() {
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canImport = hasPermission('medications.import', 'medications.write');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ['medications', search],
    queryFn: async () => {
      const res = await medicationsApi.list({ search: search || undefined, limit: 50 });
      return res.data;
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      editingId
        ? medicationsApi.update(editingId, form)
        : medicationsApi.create(form),
    onSuccess: () => {
      const wasEdit = !!editingId;
      queryClient.invalidateQueries({ queryKey: ['medications'] });
      resetForm();
      toast.success(wasEdit ? 'Medicamento actualizado' : 'Medicamento creado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo guardar el medicamento')),
  });

  const loadMedication = (med: MedicationRow) => {
    setEditingId(med.id);
    setForm(medicationToForm(med));
  };

  const handleCumBlur = async () => {
    if (!form.cum.trim()) return;
    try {
      const res = await medicationsApi.getByCum(form.cum.trim());
      const med = res.data.data as MedicationRow;
      setEditingId(med.id);
      setForm(medicationToForm(med));
      toast.info('Medicamento existente cargado para edición');
    } catch {
      if (editingId) setEditingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Medicamentos Maestros</h2>

      {canImport ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              La carga masiva del catálogo se realiza desde Importaciones.
            </p>
            <Button variant="outline" asChild>
              <Link to="/excel?tab=medications">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Ir a importaciones masivas
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className={editingId ? 'border-primary' : undefined}>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar medicamento' : 'Agregar medicamento'}</CardTitle>
          {editingId && (
            <p className="text-sm font-normal text-muted-foreground">
              Modifique los campos y guarde. También puede seleccionar una fila del catálogo para editar.
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>CUM</Label>
            <Input
              value={form.cum}
              onChange={(e) => setForm({ ...form, cum: e.target.value })}
              onBlur={handleCumBlur}
              placeholder="Al salir del campo carga el medicamento si ya existe"
            />
          </div>
          <div>
            <Label>Código interno *</Label>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Nombre *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Laboratorio</Label>
            <Input value={form.laboratory} onChange={(e) => setForm({ ...form, laboratory: e.target.value })} />
          </div>
          <div>
            <Label>Presentación</Label>
            <Input value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} />
          </div>
          <div>
            <Label>Concentración</Label>
            <Input value={form.concentration} onChange={(e) => setForm({ ...form, concentration: e.target.value })} />
          </div>
          <div>
            <Label>Estado</Label>
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button
              disabled={!form.code || !form.name || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catálogo ({data?.meta?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar por CUM, código o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isLoading ? (
            <p>Cargando...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">Código</th>
                    <th className="p-2">CUM</th>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">Laboratorio</th>
                    <th className="p-2">Presentación</th>
                    <th className="p-2">Concentración</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.data || []).map((m: MedicationRow) => (
                    <tr
                      key={m.id}
                      className={`border-b ${editingId === m.id ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
                    >
                      <td className="p-2">{m.code}</td>
                      <td className="p-2">{m.cum || '—'}</td>
                      <td className="p-2">{m.name}</td>
                      <td className="p-2">{m.laboratory || '—'}</td>
                      <td className="p-2">{m.presentation || '—'}</td>
                      <td className="p-2">{m.concentration || '—'}</td>
                      <td className="p-2">{m.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</td>
                      <td className="p-2">
                        <Button type="button" size="sm" variant="ghost" onClick={() => loadMedication(m)}>
                          <Pencil className="mr-1 h-3 w-3" />
                          Editar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
