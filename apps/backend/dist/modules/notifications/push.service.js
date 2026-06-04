"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPush = sendExpoPush;
const expo_server_sdk_1 = require("expo-server-sdk");
const prisma_1 = require("../../infra/database/prisma");
const env_1 = require("../../config/env");
const logger_1 = require("../../config/logger");
const expo = new expo_server_sdk_1.Expo({ accessToken: env_1.env.EXPO_ACCESS_TOKEN });
async function sendExpoPush(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        select: { pushToken: true },
    });
    if (!user?.pushToken || !expo_server_sdk_1.Expo.isExpoPushToken(user.pushToken)) {
        return { sent: false, reason: 'no_valid_token' };
    }
    const message = {
        to: user.pushToken,
        sound: 'default',
        title: input.title,
        body: input.body,
        data: input.data,
    };
    try {
        const tickets = await expo.sendPushNotificationsAsync([message]);
        logger_1.logger.info('Expo push sent', { userId: input.userId, ticket: tickets[0] });
        return { sent: true, ticket: tickets[0] };
    }
    catch (err) {
        logger_1.logger.error('Expo push failed', {
            userId: input.userId,
            err: err instanceof Error ? err.message : String(err),
        });
        return { sent: false, reason: 'send_failed' };
    }
}
