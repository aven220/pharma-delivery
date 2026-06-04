import { AuditAction, Prisma } from '@prisma/client';
import { prisma } from '../../infra/database/prisma';
import { logger } from '../../config/logger';

export async function writeAuditLog(input: {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldData: input.oldData as Prisma.InputJsonValue,
        newData: input.newData as Prisma.InputJsonValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  } catch (err) {
    logger.error('Audit log write failed', {
      action: input.action,
      entity: input.entity,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}
