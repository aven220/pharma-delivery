"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callService = exports.CallService = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
class CallService {
    async registerCall(input) {
        const delivery = await prisma_1.prisma.delivery.findFirst({
            where: { id: input.deliveryId, deletedAt: null },
            include: { patient: true },
        });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        const operator = await prisma_1.prisma.operator.findFirst({
            where: { userId: input.operatorId },
        });
        if (!operator)
            throw new AppError_1.NotFoundError('Operator');
        const call = await prisma_1.prisma.$transaction(async (tx) => {
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
    async list(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where = {
            ...(filters.deliveryId && { deliveryId: filters.deliveryId }),
            ...(filters.operatorId && { operatorId: filters.operatorId }),
        };
        const [data, total] = await Promise.all([
            prisma_1.prisma.callHistory.findMany({
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
            prisma_1.prisma.callHistory.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getEffectivenessStats(dateFrom, dateTo) {
        const where = {
            calledAt: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo }),
            },
        };
        const [total, answered] = await Promise.all([
            prisma_1.prisma.callHistory.count({ where }),
            prisma_1.prisma.callHistory.count({ where: { ...where, result: 'ANSWERED' } }),
        ]);
        const byOperator = await prisma_1.prisma.callHistory.groupBy({
            by: ['operatorId'],
            where,
            _count: true,
        });
        const operators = await Promise.all(byOperator.map(async (op) => {
            const operator = await prisma_1.prisma.operator.findUnique({
                where: { id: op.operatorId },
                include: { user: { select: { firstName: true, lastName: true } } },
            });
            const answeredCount = await prisma_1.prisma.callHistory.count({
                where: { operatorId: op.operatorId, result: 'ANSWERED', ...where },
            });
            return {
                operatorId: op.operatorId,
                name: operator ? `${operator.user.firstName} ${operator.user.lastName}` : 'Unknown',
                totalCalls: op._count,
                answered: answeredCount,
                effectiveness: op._count > 0 ? Math.round((answeredCount / op._count) * 100) : 0,
            };
        }));
        return {
            total,
            answered,
            effectiveness: total > 0 ? Math.round((answered / total) * 100) : 0,
            operators,
        };
    }
}
exports.CallService = CallService;
exports.callService = new CallService();
