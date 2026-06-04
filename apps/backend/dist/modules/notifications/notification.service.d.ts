import { NotificationType, Prisma } from '@prisma/client';
export declare function createUserNotification(input: {
    userId: string;
    type?: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    sendPush?: boolean;
}): Promise<{
    type: import(".prisma/client").$Enums.NotificationType;
    id: string;
    createdAt: Date;
    userId: string;
    title: string;
    body: string;
    data: Prisma.JsonValue | null;
    isRead: boolean;
    readAt: Date | null;
}>;
