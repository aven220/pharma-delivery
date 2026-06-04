import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandConfig } from '@/config/brand';
import { getApiErrorMessage } from '@/lib/api-error';

const schema = z.object({
  email: z.string().email('Correo inválido'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => authApi.forgotPassword(data.email),
    onSuccess: () => setSent(true),
  });

  const errorMessage = mutation.isError
    ? getApiErrorMessage(mutation.error, 'No se pudo enviar la solicitud.')
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si el correo existe en el sistema, recibirá instrucciones para restablecer su contraseña.
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ingrese su correo corporativo. Le enviaremos un enlace válido por 1 hora.
              </p>
              <div>
                <Input type="email" autoComplete="email" placeholder="Email" {...register('email')} />
                {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
              </div>
              {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Enviando...' : 'Enviar enlace'}
              </Button>
              <Link to="/login" className="block text-center text-sm text-primary hover:underline">
                Volver al inicio de sesión
              </Link>
            </form>
          )}
          <p className="mt-6 text-center text-xs text-muted-foreground">{BrandConfig.appName}</p>
        </CardContent>
      </Card>
    </div>
  );
}
