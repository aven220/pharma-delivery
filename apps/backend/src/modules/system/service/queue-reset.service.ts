import bcrypt from 'bcryptjs';
import { DeliveryStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/prisma';
import { writeAuditLog } from '../../../shared/audit/audit.service';
import { UnauthorizedError, ValidationError } from '../../../shared/errors/AppError';

export const QUEUE_RESET_CONFIRMATION_PHRASE = 'REINICIAR COLA';

/** Entregas ya cerradas que no se tocan en el reinicio. */
const PRESERVED_STATUSES: DeliveryStatus[] = ['DELIVERED', 'PARTIALLY_DELIVERED'];

const OPEN_ASSIGNMENT_STATUSES = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] as const;

function queueWhere(): Prisma.DeliveryWhereInput {
  return {
    deletedAt: null,
    status: { notIn: PRESERVED_STATUSES },
  };
}

function archiveUnique(value: string, id: string): string {
  const suffix = `__archived_${id}`;
  const maxLen = 190;
  if (value.length + suffix.length <= maxLen) return `${value}${suffix}`;
  return `${value.slice(0, maxLen - suffix.length)}${suffix}`;
}

function archiveDeliveryNumber(value: string, id: string): string {
  const short = id.slice(-10);
  const suffix = `__arch_${short}`;
  const maxLen = 80;
  if (value.length + suffix.length <= maxLen) return `${value}${suffix}`;
  return `${value.slice(0, maxLen - suffix.length)}${suffix}`;
}

export class QueueResetService {
  async preview() {
    const where = queueWhere();
    const [deliveries, callAssignments, courierAssignments, intermunicipalLinks] = await Promise.all([
      prisma.delivery.count({ where }),
      prisma.callAssignment.count({
        where: { deletedAt: null, delivery: where },
      }),
      prisma.assignment.count({
        where: {
          deletedAt: null,
          status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
          delivery: where,
        },
      }),
      prisma.intermunicipalRouteDelivery.count({
        where: { deletedAt: null, delivery: where },
      }),
    ]);

    return {
      deliveries,
      callAssignments,
      courierAssignments,
      intermunicipalLinks,
      preservedStatuses: PRESERVED_STATUSES,
      confirmationPhrase: QUEUE_RESET_CONFIRMATION_PHRASE,
    };
  }

  async execute(
    adminUserId: string,
    input: { confirmationPhrase: string; password: string },
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    if (input.confirmationPhrase?.trim() !== QUEUE_RESET_CONFIRMATION_PHRASE) {
      throw new ValidationError(
        `Debe escribir exactamente: ${QUEUE_RESET_CONFIRMATION_PHRASE}`
      );
    }

    const admin = await prisma.user.findFirst({
      where: { id: adminUserId, deletedAt: null },
      select: { id: true, passwordHash: true, role: { select: { name: true } } },
    });
    if (!admin || admin.role.name !== 'ADMIN') {
      throw new UnauthorizedError('Solo el administrador puede reiniciar la cola');
    }

    const passwordOk = await bcrypt.compare(input.password || '', admin.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedError('Contraseña incorrecta');
    }

    const preview = await this.preview();
    if (preview.deliveries === 0) {
      return { ...preview, archived: 0, message: 'No había entregas en cola para reiniciar' };
    }

    const now = new Date();
    const batchSize = 200;
    let archived = 0;

    for (;;) {
      const batch = await prisma.delivery.findMany({
        where: queueWhere(),
        select: { id: true, uniqueHash: true, deliveryNumber: true, status: true },
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });
      if (batch.length === 0) break;

      const ids = batch.map((d) => d.id);

      await prisma.$transaction(async (tx) => {
        await tx.callAssignment.updateMany({
          where: { deliveryId: { in: ids }, deletedAt: null },
          data: { deletedAt: now },
        });

        await tx.assignment.updateMany({
          where: {
            deliveryId: { in: ids },
            deletedAt: null,
            status: { in: [...OPEN_ASSIGNMENT_STATUSES] },
          },
          data: { deletedAt: now, status: 'CANCELLED' },
        });

        await tx.intermunicipalRouteDelivery.updateMany({
          where: { deliveryId: { in: ids }, deletedAt: null },
          data: { deletedAt: now },
        });

        const items = await tx.deliveryItem.findMany({
          where: { deliveryId: { in: ids }, deletedAt: null },
          select: { id: true, uniqueHash: true },
        });
        for (const item of items) {
          await tx.deliveryItem.update({
            where: { id: item.id },
            data: {
              deletedAt: now,
              uniqueHash: archiveUnique(item.uniqueHash, item.id),
            },
          });
        }

        for (const delivery of batch) {
          await tx.delivery.update({
            where: { id: delivery.id },
            data: {
              deletedAt: now,
              uniqueHash: archiveUnique(delivery.uniqueHash, delivery.id),
              deliveryNumber: archiveDeliveryNumber(delivery.deliveryNumber, delivery.id),
              status: 'CANCELLED',
            },
          });
          await tx.deliveryStatusLog.create({
            data: {
              deliveryId: delivery.id,
              fromStatus: delivery.status,
              toStatus: 'CANCELLED',
              action: 'QUEUE_RESET',
              observations: 'Reinicio de cola por administrador',
              changedById: adminUserId,
            },
          });
        }
      });

      archived += batch.length;
    }

    await writeAuditLog({
      userId: adminUserId,
      action: 'DELETE',
      entity: 'DeliveryQueueReset',
      entityId: adminUserId,
      oldData: preview,
      newData: { archived, at: now.toISOString() },
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return {
      ...preview,
      archived,
      message: `Cola reiniciada: ${archived} entrega(s) archivada(s)`,
    };
  }
}

export const queueResetService = new QueueResetService();
