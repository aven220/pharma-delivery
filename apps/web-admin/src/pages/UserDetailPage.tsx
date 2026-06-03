import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { usersApi, rolesApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge, Select } from '@/components/ui/textarea';
import { EditUserModal, ResetPasswordModal } from '@/components/users/UserModals';
import { PermissionGate } from '@/components/PermissionGate';
import { USER_STATUS_LABELS, ROLE_LABELS, OPERATIONAL_TYPE_LABELS } from '@/constants/labels';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => (await usersApi.getById(id!)).data.data,
    enabled: !!id,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await rolesApi.list()).data.data as Array<{ id: string; name: string }>,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => usersApi.changeStatus(id!, status),
    onSuccess: () => {
      refetch();
      toast.success('Estado actualizado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado')),
  });

  const roleMutation = useMutation({
    mutationFn: (roleId: string) => usersApi.update(id!, { roleId }),
    onSuccess: () => {
      refetch();
      toast.success('Rol actualizado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cambiar el rol')),
  });

  const operationalMutation = useMutation({
    mutationFn: (operationalType: string) => usersApi.update(id!, { operationalType }),
    onSuccess: () => {
      refetch();
      toast.success('Tipo operativo actualizado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cambiar el tipo operativo')),
  });

  if (isLoading || !data) return <p>Cargando...</p>;

  const user = data as {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    documentId?: string;
    status: string;
    role: { id: string; name: string };
    operationalType?: string;
    createdAt: string;
    lastLoginAt?: string;
    courierProfile?: { code: string };
    operatorProfile?: { code: string };
  };

  return (
    <div className="space-y-6">
      <Link to="/users" className="inline-flex items-center text-sm text-primary hover:underline">
        <ArrowLeft className="mr-2 h-4 w-4" /> Volver a usuarios
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold">{user.firstName} {user.lastName}</h2>
        <div className="flex gap-2">
          <Badge className={user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
            {USER_STATUS_LABELS[user.status] || user.status}
          </Badge>
          <Badge className="bg-blue-100 text-blue-800">{ROLE_LABELS[user.role.name] || user.role.name}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div><span className="text-muted-foreground">Email:</span> {user.email}</div>
          <div><span className="text-muted-foreground">Documento:</span> {user.documentId || 'N/A'}</div>
          <div><span className="text-muted-foreground">Teléfono:</span> {user.phone || 'N/A'}</div>
          <div><span className="text-muted-foreground">Creado:</span> {new Date(user.createdAt).toLocaleString('es-CO')}</div>
          {user.lastLoginAt && (
            <div><span className="text-muted-foreground">Último login:</span> {new Date(user.lastLoginAt).toLocaleString('es-CO')}</div>
          )}
          {user.courierProfile && (
            <div><span className="text-muted-foreground">Código domiciliario:</span> {user.courierProfile.code}</div>
          )}
          {user.operatorProfile && (
            <div><span className="text-muted-foreground">Código operador:</span> {user.operatorProfile.code}</div>
          )}
        </CardContent>
      </Card>

      <PermissionGate permissions={['users.write']}>
        <Card>
          <CardHeader><CardTitle>Gestión administrativa</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Estado del usuario</Label>
                <Select
                  value={user.status}
                  onChange={(e) => statusMutation.mutate(e.target.value)}
                  className="mt-1"
                >
                  {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Rol</Label>
                <Select
                  value={user.role.id}
                  onChange={(e) => roleMutation.mutate(e.target.value)}
                  className="mt-1"
                >
                  {(roles || []).filter((role) => role.name !== 'COURIER').map((role) => (
                    <option key={role.id} value={role.id}>
                      {ROLE_LABELS[role.name] || role.name}
                    </option>
                  ))}
                </Select>
              </div>
              {(user.role.name === 'DOMICILIARIO' || user.role.name === 'COURIER') && (
                <div>
                  <Label>Tipo operativo</Label>
                  <Select
                    value={user.operationalType || 'DOMICILIARIO'}
                    onChange={(e) => operationalMutation.mutate(e.target.value)}
                    className="mt-1"
                  >
                    {Object.entries(OPERATIONAL_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setEditOpen(true)}>Editar datos</Button>
              <Button variant="outline" onClick={() => setResetOpen(true)}>
                <KeyRound className="mr-2 h-4 w-4" />
                Restaurar contraseña
              </Button>
            </div>
          </CardContent>
        </Card>

        <EditUserModal
          open={editOpen}
          onOpenChange={setEditOpen}
          user={{
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            documentId: user.documentId,
            roleId: user.role.id,
            status: user.status,
          }}
          onUpdated={() => {
            refetch();
            setEditOpen(false);
          }}
        />

        <ResetPasswordModal
          open={resetOpen}
          onOpenChange={setResetOpen}
          user={{
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }}
        />
      </PermissionGate>
    </div>
  );
}
