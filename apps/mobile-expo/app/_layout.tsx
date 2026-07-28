import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { startAutoSync, stopAutoSync, performFullSync } from '../sync/syncManager';
import { connectSocket, disconnectSocket } from '../sockets/client';
import { ensureValidSession } from '../services/api';
import { isOnline } from '../utils/network';
import { registerPushToken } from '../services/pushRegistration';
import { getDatabase } from '../database';
import { homeRouteForUser, isFieldWorker } from '../lib/roles';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

const queryClient = new QueryClient();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading, loadStoredAuth, user } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
    getDatabase().catch(console.error);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const inAuth = segments[0] === 'login';

    (async () => {
      let hasSession = !!accessToken;
      if (hasSession && (await isOnline())) {
        hasSession = await ensureValidSession();
      }
      if (cancelled) return;

      if (!hasSession && !inAuth) {
        router.replace('/login');
      } else if (hasSession && inAuth) {
        router.replace(homeRouteForUser(useAuthStore.getState().user));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isLoading, segments]);

  useEffect(() => {
    if (isLoading || !accessToken) {
      if (!accessToken) {
        stopAutoSync();
        disconnectSocket();
      }
      return;
    }

    let cancelled = false;
    const field = isFieldWorker(user);

    (async () => {
      if (await isOnline()) {
        const ok = await ensureValidSession();
        if (cancelled || !ok) return;
        connectSocket();
        await registerPushToken().catch(() => {});
        if (field) {
          await performFullSync().catch(() => {});
        }
      }
      if (field) startAutoSync();
    })();

    return () => {
      cancelled = true;
      stopAutoSync();
      disconnectSocket();
    };
  }, [accessToken, isLoading, user]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="route/[id]" options={{ headerShown: true, title: 'Detalle de ruta' }} />
            <Stack.Screen name="delivery/[id]" options={{ headerShown: true, title: 'Detalle de entrega' }} />
            <Stack.Screen name="call/[id]" options={{ headerShown: true, title: 'Gestionar llamada' }} />
          </Stack>
          <StatusBar style="auto" />
        </AuthGuard>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
