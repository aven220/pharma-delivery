import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { notificationsApi } from '@/services/api';
import { Button } from '@/components/ui/button';

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  data?: { kind?: string; tab?: string } | null;
}

export function CallNotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const res = await notificationsApi.unreadCount();
      return (res.data as { data: { count: number } }).data.count;
    },
    refetchInterval: 15000,
  });

  const { data: recent = [], isFetching } = useQuery({
    queryKey: ['notifications-recent'],
    queryFn: async () => {
      const res = await notificationsApi.list({ limit: 10 });
      return (res.data as { data: NotificationRow[] }).data;
    },
    refetchInterval: 15000,
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: NotificationRow) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    setOpen(false);

    const tab =
      notification.data?.tab ||
      (notification.data?.kind === 'CALL_ASSIGNMENT' ? 'my-calls' : null);
    if (tab) {
      navigate(`/calls?tab=${tab}`);
      return;
    }
    navigate('/notifications');
  };

  const unreadRecent = recent.filter((n) => !n.isRead);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative"
        onClick={() => setOpen((value) => !value)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} notificaciones sin leer`
            : 'Notificaciones de llamadas'
        }
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border bg-background shadow-lg">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-medium">Alertas</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} sin leer — revise cuando le asignen llamadas`
                : 'Sin alertas pendientes'}
            </p>
          </div>

          <div className="max-h-72 overflow-auto">
            {isFetching && recent.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Cargando...</p>
            ) : unreadRecent.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                No hay alertas nuevas.
              </p>
            ) : (
              unreadRecent.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-muted/60"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <p className="font-medium leading-snug">{notification.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {notification.body}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString('es-CO')}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-center text-xs"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              Ver todas las notificaciones
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
