import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { intermunicipalRoutesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

export function RouteMunicipalitiesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['route-municipalities', search],
    queryFn: async () => (await intermunicipalRoutesApi.listMunicipalities({ search, limit: 100 })).data.data,
  });

  const createMutation = useMutation({
    mutationFn: () => intermunicipalRoutesApi.createMunicipality({ name, code: code || undefined }),
    onSuccess: () => {
      setName('');
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['route-municipalities'] });
      toast.success('Municipio creado correctamente');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo crear el municipio')),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      intermunicipalRoutesApi.setMunicipalityActive(id, isActive),
    onSuccess: (_data, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['route-municipalities'] });
      toast.success(isActive ? 'Municipio activado' : 'Municipio desactivado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo actualizar el municipio')),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Municipios de ruta</h2>

      <Card>
        <CardHeader><CardTitle>Nuevo municipio</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input placeholder="Nombre (ej: Piendamó)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Código (opcional)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button disabled={!name.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
            Crear
          </Button>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Input placeholder="Buscar municipio..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <p>Cargando...</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((m: { id: string; name: string; code?: string; isActive: boolean }) => (
            <Card key={m.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{m.name}</p>
                  {m.code && <p className="text-sm text-muted-foreground">{m.code}</p>}
                </div>
                <Button
                  variant={m.isActive ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleMutation.mutate({ id: m.id, isActive: !m.isActive })}
                >
                  {m.isActive ? 'Desactivar' : 'Activar'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
