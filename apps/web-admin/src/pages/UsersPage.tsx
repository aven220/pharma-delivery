import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Select } from '@/components/ui/textarea';
import { CreateUserModal, EditUserModal, ResetPasswordModal } from '@/components/users/UserModals';
import { PermissionGate } from '@/components/PermissionGate';
import { USER_STATUS_LABELS, ROLE_LABELS } from '@/constants/labels';
import { Plus, Search, Pencil, KeyRound } from 'lucide-react';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  documentId?: string;
  status: string;
  role: { id: string; name: string };
  createdAt: string;
}

export function UsersPage() {
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const res = await usersApi.list({ search, limit: 50 });
      return res.data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => usersApi.changeStatus(id, status),
    onSuccess: () => {
      refetch();
      toast.success('Estado actualizado');
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado')),
  });

  const users = (data?.data || []) as UserRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Usuarios</h2>
        <PermissionGate permissions={['users.write']}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo usuario
          </Button>
        </PermissionGate>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, email, documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p>Cargando usuarios...</p>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">
                    <Link to={`/users/${user.id}`} className="hover:text-primary">
                      {user.firstName} {user.lastName}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                      {USER_STATUS_LABELS[user.status] || user.status}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-800">
                      {ROLE_LABELS[user.role.name] || user.role.name}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1 text-sm text-muted-foreground md:grid-cols-3">
                  <span>{user.email}</span>
                  <span>{user.documentId || 'Sin documento'}</span>
                  <span>{user.phone || 'Sin teléfono'}</span>
                </div>
                <PermissionGate permissions={['users.write']}>
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button size="sm" variant="outline" onClick={() => setEditUser(user)}>
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setResetUser(user)}>
                      <KeyRound className="mr-1 h-3 w-3" /> Restaurar contraseña
                    </Button>
                    <Select
                      value={user.status}
                      onChange={(e) => statusMutation.mutate({ id: user.id, status: e.target.value })}
                      className="w-40"
                    >
                      {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </div>
                </PermissionGate>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} onCreated={() => refetch()} />

      {editUser && (
        <EditUserModal
          open={!!editUser}
          onOpenChange={(open) => !open && setEditUser(null)}
          user={{
            id: editUser.id,
            email: editUser.email,
            firstName: editUser.firstName,
            lastName: editUser.lastName,
            phone: editUser.phone,
            documentId: editUser.documentId,
            roleId: editUser.role.id,
            status: editUser.status,
          }}
          onUpdated={() => {
            refetch();
            setEditUser(null);
          }}
        />
      )}

      <ResetPasswordModal
        open={!!resetUser}
        onOpenChange={(open) => !open && setResetUser(null)}
        user={resetUser}
      />
    </div>
  );
}
