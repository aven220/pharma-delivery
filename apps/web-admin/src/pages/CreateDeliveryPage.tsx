import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { patientsApi } from '@/services/api';
import { toast } from '@/store/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea, Select } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Trash2 } from 'lucide-react';
import { MedicationAutocomplete, type MedicationOption } from '@/components/medications/MedicationAutocomplete';

interface MedicationRow {
  medicationCode: string;
  medicationName: string;
  quantity: number;
}

interface PatientOption {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  documentType?: string;
  phone?: string | null;
  address?: string;
}

export function CreateDeliveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [patientSearch, setPatientSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);
  const [error, setError] = useState('');
  const [medications, setMedications] = useState<MedicationRow[]>([
    { medicationCode: '', medicationName: '', quantity: 1 },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(patientSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const { data: preselectedPatient } = useQuery({
    queryKey: ['patient', preselectedPatientId],
    queryFn: async () =>
      (await patientsApi.getById(preselectedPatientId!)).data.data as PatientOption,
    enabled: !!preselectedPatientId,
  });

  useEffect(() => {
    if (preselectedPatient) {
      setMode('existing');
      setSelectedPatient(preselectedPatient);
      setPatientSearch(
        `${preselectedPatient.firstName} ${preselectedPatient.lastName} — ${preselectedPatient.documentId}`
      );
    }
  }, [preselectedPatient]);

  const { data: patientsData, isFetching: searchingPatients } = useQuery({
    queryKey: ['patients-search', debouncedSearch],
    queryFn: async () =>
      (await patientsApi.list({ search: debouncedSearch, limit: 20 })).data.data as PatientOption[],
    enabled: mode === 'existing' && debouncedSearch.length >= 2,
  });

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => patientsApi.createDeliveryManual(data),
    onSuccess: () => {
      toast.success('Entrega creada correctamente');
      navigate('/deliveries');
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error || err.message
        : err instanceof Error
          ? err.message
          : 'No se pudo crear la entrega';
      setError(message);
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (mode === 'existing' && !selectedPatient) {
      setError('Seleccione un paciente de la búsqueda');
      return;
    }

    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      priority: form.get('priority'),
      observations: form.get('observations'),
      scheduledDate: form.get('scheduledDate') || undefined,
      scheduledTime: form.get('scheduledTime') || undefined,
      documentNumber: form.get('documentNumber') || undefined,
      medications,
    };

    if (mode === 'existing') {
      payload.patientId = selectedPatient!.id;
    } else {
      payload.newPatient = {
        documentId: form.get('documentId'),
        firstName: form.get('firstName'),
        lastName: form.get('lastName'),
        phone: form.get('phone'),
        address: form.get('address'),
        city: form.get('city'),
        neighborhood: form.get('neighborhood'),
      };
    }

    mutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-3xl font-bold">Nueva entrega manual</h2>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Paciente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={mode} onChange={(e) => {
              setMode(e.target.value as 'existing' | 'new');
              setSelectedPatient(null);
              setPatientSearch('');
            }}>
              <option value="existing">Paciente existente</option>
              <option value="new">Nuevo paciente</option>
            </Select>

            {mode === 'existing' ? (
              <div className="space-y-3">
                <div>
                  <Label>Buscar por nombre o documento *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Ej: Juan Pérez o 1234567890"
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setSelectedPatient(null);
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Escriba al menos 2 caracteres para buscar
                  </p>
                </div>

                {selectedPatient && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                    <p className="font-medium">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Doc: {selectedPatient.documentId}
                      {selectedPatient.phone ? ` · Tel: ${selectedPatient.phone}` : ''}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 px-2"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientSearch('');
                      }}
                    >
                      Cambiar paciente
                    </Button>
                  </div>
                )}

                {!selectedPatient && debouncedSearch.length >= 2 && (
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    {searchingPatients ? (
                      <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
                    ) : (patientsData || []).length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">No se encontraron pacientes</p>
                    ) : (
                      (patientsData || []).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="flex w-full flex-col border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientSearch(`${p.firstName} ${p.lastName} — ${p.documentId}`);
                          }}
                        >
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Doc: {p.documentId}
                            {p.phone ? ` · ${p.phone}` : ''}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Documento *</Label><Input name="documentId" required={mode === 'new'} /></div>
                <div><Label>Teléfono</Label><Input name="phone" /></div>
                <div><Label>Nombre *</Label><Input name="firstName" required={mode === 'new'} /></div>
                <div><Label>Apellido *</Label><Input name="lastName" required={mode === 'new'} /></div>
                <div className="md:col-span-2"><Label>Dirección *</Label><Input name="address" required={mode === 'new'} /></div>
                <div><Label>Ciudad</Label><Input name="city" /></div>
                <div><Label>Barrio</Label><Input name="neighborhood" /></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Entrega</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Prioridad</Label>
              <Select name="priority" defaultValue="MEDIUM">
                <option value="URGENT">Urgente</option>
                <option value="HIGH">Alta</option>
                <option value="MEDIUM">Media</option>
                <option value="LOW">Baja</option>
              </Select>
            </div>
            <div><Label>Nro. documento</Label><Input name="documentNumber" /></div>
            <div><Label>Fecha</Label><Input name="scheduledDate" type="date" /></div>
            <div><Label>Hora</Label><Input name="scheduledTime" /></div>
            <div className="md:col-span-2"><Label>Observaciones</Label><Textarea name="observations" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Medicamentos</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => setMedications([...medications, { medicationCode: '', medicationName: '', quantity: 1 }])}>
              <Plus className="mr-1 h-4 w-4" /> Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {medications.map((med, idx) => (
              <div key={idx} className="grid gap-3 rounded-md border p-4 md:grid-cols-4">
                <div className="md:col-span-2">
                  <Label>Medicamento</Label>
                  <MedicationAutocomplete
                    onSelect={(option: MedicationOption) => {
                      const n = [...medications];
                      n[idx] = {
                        medicationCode: option.cum || option.code,
                        medicationName: option.name,
                        quantity: n[idx].quantity,
                      };
                      setMedications(n);
                    }}
                  />
                </div>
                <div><Label>Código/CUM</Label><Input value={med.medicationCode} readOnly className="bg-muted" /></div>
                <div><Label>Nombre</Label><Input value={med.medicationName} readOnly className="bg-muted" /></div>
                <div><Label>Cantidad</Label><Input type="number" min={1} value={med.quantity} onChange={(e) => { const n = [...medications]; n[idx].quantity = Number(e.target.value); setMedications(n); }} /></div>
                <div className="flex items-end">
                  <Button type="button" variant="ghost" onClick={() => setMedications(medications.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creando...' : 'Crear entrega'}
        </Button>
      </form>
    </div>
  );
}
