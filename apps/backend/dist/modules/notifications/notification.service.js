"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserNotification = createUserNotification;
const prisma_1 = require("../../infra/database/prisma");
const push_service_1 = require("./push.service");
async function createUserNotification(input) {
    const notification = await prisma_1.prisma.notification.create({
        data: {
            userId: input.userId,
            type: input.type || 'SYSTEM',
            title: input.title,
            body: input.body,
            data: input.data,
        },
    });
    if (input.sendPush !== false) {
        await (0, push_service_1.sendExpoPush)({
            userId: input.userId,
            title: input.title,
            body: input.body,
            data: { notificationId: notification.id, ...(input.data || {}) },
        });
    }
    return notification;
}
