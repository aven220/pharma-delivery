import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/api-error';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationsApi.list({ limit: 50 });
      return res.data as { data: NotificationRow[]; meta: { total: number } };
    },
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    },
  });

  const notifications = data?.data ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">
            Centro de alertas del sistema{unread > 0 ? ` · ${unread} sin leer` : ''}
          </p>
        </div>
        {unread > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como leídas
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground">Cargando...</p>}
      {isError && (
        <p className="text-sm text-red-500">
          {getApiErrorMessage(error, 'No se pudieron cargar las notificaciones.')}
        </p>
      )}

      {!isLoading && notifications.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Bell className="h-10 w-10 opacity-40" />
            <p>No hay notificaciones</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {notifications.map((n) => (
          <Card key={n.id} className={n.isRead ? 'opacity-75' : 'border-primary/30'}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">{n.title}</CardTitle>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markRead.mutate(n.id)}
                    disabled={markRead.isPending}
                  >
                    Marcar leída
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{n.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString('es-CO')} · {n.type}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
