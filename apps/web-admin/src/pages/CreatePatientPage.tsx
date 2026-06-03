import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { patientsApi } from '@/services/api';
import { toast } from '@/store/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CreatePatientPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => patientsApi.createManual(data),
    onSuccess: (res) => {
      const patientId = res.data.data.patient.id as string;
      toast.success('Paciente registrado. Ahora puede crear la entrega con medicamentos.');
      navigate(`/deliveries/new?patientId=${patientId}`);
    },
    onError: (err) => {
      const message = isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error || err.message
        : err instanceof Error
          ? err.message
          : 'No se pudo crear el paciente';
      setError(message);
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    mutation.mutate({
      documentId: form.get('documentId'),
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      phone: form.get('phone'),
      address: form.get('address'),
      city: form.get('city'),
      neighborhood: form.get('neighborhood'),
      observations: form.get('observations'),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h2 className="text-3xl font-bold">Registro manual de paciente</h2>
      <p className="text-muted-foreground">
        Registre solo los datos del paciente. Los medicamentos y la entrega se crean en{' '}
        <strong>Nueva entrega</strong>.
      </p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader><CardTitle>Datos del paciente</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div><Label>Documento *</Label><Input name="documentId" required /></div>
            <div><Label>Teléfono</Label><Input name="phone" /></div>
            <div><Label>Nombre *</Label><Input name="firstName" required /></div>
            <div><Label>Apellido *</Label><Input name="lastName" required /></div>
            <div className="md:col-span-2"><Label>Dirección *</Label><Input name="address" required /></div>
            <div><Label>Ciudad</Label><Input name="city" /></div>
            <div><Label>Barrio</Label><Input name="neighborhood" /></div>
            <div className="md:col-span-2">
              <Label>Observaciones</Label>
              <Textarea name="observations" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : 'Registrar paciente'}
        </Button>
      </form>
    </div>
  );
}
