import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { prisma } from '../../infra/database/prisma';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

export async function sendExpoPush(input: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
    return { sent: false, reason: 'no_valid_token' };
  }

  const message: ExpoPushMessage = {
    to: user.pushToken,
    sound: 'default',
    title: input.title,
    body: input.body,
    data: input.data,
  };

  try {
    const tickets = await expo.sendPushNotificationsAsync([message]);
    logger.info('Expo push sent', { userId: input.userId, ticket: tickets[0] });
    return { sent: true, ticket: tickets[0] };
  } catch (err) {
    logger.error('Expo push failed', {
      userId: input.userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, reason: 'send_failed' };
  }
}
