import { prisma } from '../../../infra/database/prisma';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { CallResult } from '@prisma/client';

export class CallService {
  async registerCall(input: {
    deliveryId: string;
    operatorId: string;
    phoneUsed: string;
    result: CallResult;
    durationSec?: number;
    observations?: string;
    newPhone?: string;
    newAddress?: string;
    rescheduleDate?: string;
    rescheduleTime?: string;
  }) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: input.deliveryId, deletedAt: null },
      include: { patient: true },
    });
    if (!delivery) throw new NotFoundError('Delivery');

    const operator = await prisma.operator.findFirst({
      where: { userId: input.operatorId },
    });
    if (!operator) throw new NotFoundError('Operator');

    const call = await prisma.$transaction(async (tx) => {
      if (input.newPhone || input.newAddress) {
        await tx.patient.update({
          where: { id: delivery.patientId },
          data: {
            ...(input.newPhone && { phone: input.newPhone }),
            ...(input.newAddress && { address: input.newAddress }),
          },
        });
      }

      if (input.result === 'RESCHEDULE' && input.rescheduleDate) {
        await tx.delivery.update({
          where: { id: input.deliveryId },
          data: {
            status: 'RESCHEDULED',
            scheduledDate: new Date(input.rescheduleDate),
            scheduledTime: input.rescheduleTime,
          },
        });
      }

      return tx.callHistory.create({
        data: {
          deliveryId: input.deliveryId,
          patientId: delivery.patientId,
          operatorId: operator.id,
          phoneUsed: input.phoneUsed,
          result: input.result,
          durationSec: input.durationSec,
          observations: input.observations,
          newPhone: input.newPhone,
          newAddress: input.newAddress,
          rescheduleDate: input.rescheduleDate ? new Date(input.rescheduleDate) : undefined,
          rescheduleTime: input.rescheduleTime,
        },
        include: {
          delivery: { select: { deliveryNumber: true } },
          operator: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      });
    });

    return call;
  }

  async list(filters: { deliveryId?: string; operatorId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.deliveryId && { deliveryId: filters.deliveryId }),
      ...(filters.operatorId && { operatorId: filters.operatorId }),
    };

    const [data, total] = await Promise.all([
      prisma.callHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { calledAt: 'desc' },
        include: {
          delivery: { select: { deliveryNumber: true } },
          patient: { select: { firstName: true, lastName: true, phone: true } },
          operator: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      }),
      prisma.callHistory.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getEffectivenessStats(dateFrom?: Date, dateTo?: Date) {
    const where = {
      calledAt: {
        ...(dateFrom && { gte: dateFrom }),
        ...(dateTo && { lte: dateTo }),
      },
    };

    const [total, answered] = await Promise.all([
      prisma.callHistory.count({ where }),
      prisma.callHistory.count({ where: { ...where, result: 'ANSWERED' } }),
    ]);

    const byOperator = await prisma.callHistory.groupBy({
      by: ['operatorId'],
      where,
      _count: true,
    });

    const operators = await Promise.all(
      byOperator.map(async (op) => {
        const operator = await prisma.operator.findUnique({
          where: { id: op.operatorId },
          include: { user: { select: { firstName: true, lastName: true } } },
        });
        const answeredCount = await prisma.callHistory.count({
          where: { operatorId: op.operatorId, result: 'ANSWERED', ...where },
        });
        return {
          operatorId: op.operatorId,
          name: operator ? `${operator.user.firstName} ${operator.user.lastName}` : 'Unknown',
          totalCalls: op._count,
          answered: answeredCount,
          effectiveness: op._count > 0 ? Math.round((answeredCount / op._count) * 100) : 0,
        };
      })
    );

    return {
      total,
      answered,
      effectiveness: total > 0 ? Math.round((answered / total) * 100) : 0,
      operators,
    };
  }
}

export const callService = new CallService();
