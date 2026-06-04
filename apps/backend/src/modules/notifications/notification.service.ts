import { NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma';
import { sendExpoPush } from './push.service';

export async function createUserNotification(input: {
  userId: string;
  type?: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sendPush?: boolean;
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type || 'SYSTEM',
      title: input.title,
      body: input.body,
      data: input.data as Prisma.InputJsonValue,
    },
  });

  if (input.sendPush !== false) {
    await sendExpoPush({
      userId: input.userId,
      title: input.title,
      body: input.body,
      data: { notificationId: notification.id, ...(input.data || {}) },
    });
  }

  return notification;
}
