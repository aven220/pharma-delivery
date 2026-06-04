import { AuditAction } from '@prisma/client';
export declare function writeAuditLog(input: {
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    oldData?: unknown;
    newData?: unknown;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void>;
