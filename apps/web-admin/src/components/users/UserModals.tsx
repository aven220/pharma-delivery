import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { rolesApi } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/services/api';
import { USER_STATUS_LABELS, ROLE_LABELS } from '@/constants/labels';
import { toast } from '@/store/toast.store';
import { getApiErrorMessage } from '@/lib/api-error';
import { generateTemporaryPassword } from '@/lib/password';
import { KeyRound, Copy, Eye, EyeOff } from 'lucide-react';

interface Role {
  id: string;
  name: string;
}

interface UserForm {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  documentId?: string;
  roleId: string;
  status?: string;
}

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValues?: Partial<UserForm>;
  onSubmit: (data: UserForm) => Promise<void>;
  showPassword?: boolean;
  showStatus?: boolean;
  submitLabel?: string;
  successMessage?: string;
}

const EMPTY_FORM: UserForm = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  documentId: '',
  roleId: '',
  status: 'ACTIVE',
};

export function UserFormModal({
  open,
  onOpenChange,
  title,
  defaultValues,
  onSubmit,
  showPassword = false,
  showStatus = false,
  submitLabel = 'Guardar',
  successMessage = 'Usuario guardado correctamente',
}: UserModalProps) {
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => (await rolesApi.list()).data.data as Role[],
    enabled: open,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<UserForm>({
    defaultValues: { ...EMPTY_FORM, ...defaultValues },
  });

  useEffect(() => {
    if (open) {
      reset({ ...EMPTY_FORM, ...defaultValues });
    }
  }, [open, defaultValues, reset]);

  const handleClose = (value: boolean) => {
    if (!value) reset({ ...EMPTY_FORM, ...defaultValues });
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(
            async (data) => {
              try {
                await onSubmit(data);
                toast.success(successMessage);
                handleClose(false);
              } catch (error) {
                toast.error(getApiErrorMessage(error, 'No se pudo guardar el usuario'));
              }
            },
            () => toast.error('Complete los campos requeridos')
          )}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input {...register('firstName', { required: true })} />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input {...register('lastName', { required: true })} />
            </div>
          </div>
          <div>
            <Label>Documento</Label>
            <Input {...register('documentId')} />
          </div>
          <div>
            <Label>Correo</Label>
            <Input type="email" {...register('email', { required: true })} />
          </div>
          <div>
            <Label>Teléfono</Label>
            <Input {...register('phone')} />
          </div>
          {showPassword && (
            <div>
              <Label>Contraseña</Label>
              <Input type="password" {...register('password', { required: showPassword, minLength: 8 })} />
            </div>
          )}
          <div>
            <Label>Rol</Label>
            <Select {...register('roleId', { required: true })}>
              <option value="">Seleccionar rol</option>
              {(roles || []).filter((role) => role.name !== 'COURIER').map((role) => (
                <option key={role.id} value={role.id}>{ROLE_LABELS[role.name] || role.name}</option>
              ))}
            </Select>
          </div>
          {showStatus && (
            <div>
              <Label>Estado</Label>
              <Select {...register('status', { required: showStatus })}>
                {Object.entries(USER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const mutation = useMutation({
    mutationFn: (data: UserForm) => usersApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => onCreated(),
  });

  return (
    <UserFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Crear usuario"
      showPassword
      submitLabel="Crear"
      successMessage="Usuario creado correctamente"
      onSubmit={async (data) => { await mutation.mutateAsync(data); }}
    />
  );
}

export function EditUserModal({
  open,
  onOpenChange,
  user,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserForm & { id: string };
  onUpdated: () => void;
}) {
  const mutation = useMutation({
    mutationFn: (data: UserForm) =>
      usersApi.update(user.id, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        documentId: data.documentId,
        roleId: data.roleId,
        status: data.status,
      }),
    onSuccess: () => onUpdated(),
  });

  return (
    <UserFormModal
      open={open}
      onOpenChange={onOpenChange}
      title="Editar usuario"
      defaultValues={user}
      showStatus
      successMessage="Usuario actualizado correctamente"
      onSubmit={async (data) => { await mutation.mutateAsync(data); }}
    />
  );
}

interface ResetPasswordUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ResetPasswordUser | null;
}) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const mutation = useMutation({
    mutationFn: () => usersApi.resetPassword(user!.id, password),
    onSuccess: () => {
      toast.success(`Contraseña restaurada para ${user!.firstName} ${user!.lastName}`);
      setPassword('');
      setShowPassword(false);
      onOpenChange(false);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'No se pudo restaurar la contraseña')),
  });

  useEffect(() => {
    if (open) {
      setPassword('');
      setShowPassword(false);
    }
  }, [open, user?.id]);

  const handleGenerate = () => {
    const generated = generateTemporaryPassword();
    setPassword(generated);
    setShowPassword(true);
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Contraseña copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar la contraseña');
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Restaurar contraseña
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">{user.firstName} {user.lastName}</p>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          <p className="text-sm text-muted-foreground">
            Asigne una nueva contraseña temporal. El usuario deberá iniciar sesión con ella.
            Las sesiones activas se cerrarán automáticamente.
          </p>

          <div>
            <Label htmlFor="reset-password">Nueva contraseña</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-10 px-0"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 w-10 px-0"
                disabled={!password}
                onClick={handleCopy}
                aria-label="Copiar contraseña"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={handleGenerate}>
            Generar contraseña temporal
          </Button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={password.length < 8 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Restaurando...' : 'Restaurar contraseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
