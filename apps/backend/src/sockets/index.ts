import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { prisma } from '../infra/database/prisma';
import type { JwtPayload } from '@pharma/types';

export function setupSocketIO(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as JwtPayload;
    logger.info('Socket connected', { userId: user.sub, role: user.role });

    socket.join(`user:${user.sub}`);
    socket.join(`role:${user.role}`);

    if (user.role === 'COURIER' || user.role === 'DOMICILIARIO') {
      socket.join('couriers');
    }
    if (user.role === 'ADMIN' || user.role === 'SUPERVISOR') {
      socket.join('admin');
    }

    socket.on('gps:update', (data: { lat: number; lng: number; deliveryId?: string }) => {
      prisma.courier.update({
        where: { userId: user.sub },
        data: {
          currentLat: data.lat,
          currentLng: data.lng,
          lastGpsAt: new Date(),
          lastConnectedAt: new Date(),
        },
      }).catch(() => {});

      socket.to('admin').emit('courier:location', {
        userId: user.sub,
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    if (user.role === 'COURIER' || user.role === 'DOMICILIARIO') {
      prisma.courier.update({
        where: { userId: user.sub },
        data: { lastConnectedAt: new Date() },
      }).catch(() => {});
    }

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { userId: user.sub });
    });
  });
}

export const SOCKET_EVENTS = {
  DELIVERY_CREATED: 'delivery.created',
  DELIVERY_UPDATED: 'delivery.updated',
  DELIVERY_COMPLETED: 'delivery.completed',
  ASSIGNMENT_CREATED: 'assignment.created',
  ASSIGNMENT_UPDATED: 'assignment.updated',
  INCIDENT_CREATED: 'incident.created',
} as const;
