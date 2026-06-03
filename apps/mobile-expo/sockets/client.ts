import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { ensureValidSession } from '../services/api';
import { fetchAndCacheDeliveries } from '../sync/syncManager';
import { API_URL } from '../config/api';

let socket: Socket | null = null;
let listenersAttached = false;
let refreshingOnError = false;

function attachAssignmentListeners(sock: Socket): void {
  if (listenersAttached) return;
  listenersAttached = true;

  sock.on('assignment.created', async (payload: { delivery?: { deliveryNumber?: string } }) => {
    console.log('Nueva asignación recibida:', payload?.delivery?.deliveryNumber);
    await fetchAndCacheDeliveries();
  });

  sock.on('assignment.updated', async () => {
    console.log('Asignación actualizada');
    await fetchAndCacheDeliveries();
  });

  sock.on('route.carry_over', async (payload: { movedCount?: number }) => {
    console.log('Ruta reprogramada:', payload?.movedCount, 'paradas');
    await fetchAndCacheDeliveries();
  });

  sock.on('route.dispatched', async (payload: { routeCode?: string }) => {
    console.log('Ruta despachada:', payload?.routeCode);
    await fetchAndCacheDeliveries();
  });

  sock.on('route.transferred', async () => {
    console.log('Ruta transferida');
    await fetchAndCacheDeliveries();
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket | null {
  const token = useAuthStore.getState().accessToken;
  if (!token) return null;

  if (socket?.connected) {
    attachAssignmentListeners(socket);
    return socket;
  }

  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersAttached = false;
  }

  socket = io(API_URL, {
    auth: (cb) => {
      cb({ token: useAuthStore.getState().accessToken });
    },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    refreshingOnError = false;
    console.log('Socket connected');
  });

  socket.on('disconnect', () => console.log('Socket disconnected'));

  socket.on('connect_error', async (err) => {
    const isAuthError =
      err.message === 'Invalid token' || err.message === 'Authentication required';

    if (!isAuthError) {
      // Red local inestable: polling reintentará; no bloquear la app
      console.warn('Socket desconectado:', err.message);
      return;
    }
    if (refreshingOnError) return;
    refreshingOnError = true;
    const ok = await ensureValidSession();
    if (ok) {
      socket?.connect();
    } else {
      console.error('Socket error: sesión expirada, inicie sesión nuevamente');
    }
  });

  attachAssignmentListeners(socket);

  return socket;
}

export function reconnectSocket(): void {
  disconnectSocket();
  connectSocket();
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    listenersAttached = false;
    refreshingOnError = false;
  }
}

export function emitGpsUpdate(lat: number, lng: number, deliveryId?: string): void {
  socket?.emit('gps:update', { lat, lng, deliveryId });
}
