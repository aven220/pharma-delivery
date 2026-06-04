"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PENDING_SUBREASONS = exports.DEACTIVATION_REASONS = exports.deliveryStatusService = exports.DeliveryStatusService = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
const ASSIGNABLE_STATUSES = ['CONFIRMED_FOR_DELIVERY', 'SCHEDULED'];
class DeliveryStatusService {
    async logStatusChange(tx, input) {
        return tx.deliveryStatusLog.create({ data: input });
    }
    async getHistory(deliveryId) {
        return prisma_1.prisma.deliveryStatusLog.findMany({
            where: { deliveryId },
            orderBy: { createdAt: 'desc' },
            include: {
                changedBy: { select: { firstName: true, lastName: true, email: true } },
            },
        });
    }
    async transition(deliveryId, userId, input) {
        const delivery = await prisma_1.prisma.delivery.findFirst({
            where: { id: deliveryId, deletedAt: null },
        });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        return prisma_1.prisma.$transaction(async (tx) => {
            const updated = await tx.delivery.update({
                where: { id: deliveryId },
                data: {
                    status: input.toStatus,
                    observations: input.observations ?? delivery.observations,
                    ...(input.toStatus === 'CANCELLED' && { failureReason: input.observations }),
                    ...(input.scheduledDate && { scheduledDate: new Date(input.scheduledDate) }),
                    ...(input.scheduledTime && { scheduledTime: input.scheduledTime }),
                    ...(input.toStatus === 'DELIVERED' && { deliveredAt: new Date() }),
                    ...(input.toStatus === 'NOT_DELIVERED' || input.toStatus === 'FAILED'
                        ? { failedAt: new Date(), failureReason: input.observations }
                        : {}),
                },
            });
            await this.logStatusChange(tx, {
                deliveryId,
                fromStatus: delivery.status,
                toStatus: input.toStatus,
                action: input.action,
                changedById: userId,
                observations: input.observations,
                deactivationReason: input.deactivationReason,
                pendingSubreason: input.pendingSubreason,
            });
            return updated;
        });
    }
    async confirmForDelivery(deliveryId, userId, observations) {
        return this.transition(deliveryId, userId, {
            toStatus: 'CONFIRMED_FOR_DELIVERY',
            action: 'CONFIRM_FOR_DELIVERY',
            observations,
        });
    }
    async setPending(deliveryId, userId, pendingSubreason, observations) {
        if (!observations?.trim()) {
            throw new AppError_1.ValidationError('Debe indicar observación al marcar como pendiente');
        }
        return this.transition(deliveryId, userId, {
            toStatus: 'PENDING_CALL',
            action: 'SET_PENDING',
            pendingSubreason,
            observations,
        });
    }
    async deactivate(deliveryId, userId, deactivationReason, observations) {
        if (!observations?.trim() && deactivationReason === 'OTHER') {
            throw new AppError_1.ValidationError('Debe indicar observación para dar de baja');
        }
        return this.transition(deliveryId, userId, {
            toStatus: 'CANCELLED',
            action: 'DEACTIVATE',
            deactivationReason,
            observations,
        });
    }
    async reactivate(deliveryId, userId, observations) {
        const delivery = await prisma_1.prisma.delivery.findFirst({
            where: { id: deliveryId, deletedAt: null },
        });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        if (delivery.status !== 'CANCELLED') {
            throw new AppError_1.ValidationError('Solo se pueden reactivar entregas dadas de baja');
        }
        return this.transition(deliveryId, userId, {
            toStatus: 'PENDING_CALL',
            action: 'REACTIVATE',
            observations,
        });
    }
    async markCallCompleted(deliveryId, userId) {
        const delivery = await prisma_1.prisma.delivery.findFirst({ where: { id: deliveryId, deletedAt: null } });
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        if (['CONFIRMED_FOR_DELIVERY', 'CANCELLED', 'DELIVERED'].includes(delivery.status)) {
            return delivery;
        }
        return this.transition(deliveryId, userId, {
            toStatus: 'CALL_COMPLETED',
            action: 'CALL_COMPLETED',
        });
    }
    canAssignToCourier(status) {
        return ASSIGNABLE_STATUSES.includes(status);
    }
}
exports.DeliveryStatusService = DeliveryStatusService;
exports.deliveryStatusService = new DeliveryStatusService();
exports.DEACTIVATION_REASONS = [
    { value: 'PATIENT_DECEASED', label: 'Paciente fallecido' },
    { value: 'WRONG_ADDRESS', label: 'Dirección incorrecta' },
    { value: 'WRONG_NUMBER', label: 'Número incorrecto' },
    { value: 'TREATMENT_REJECTED', label: 'Paciente rechaza tratamiento' },
    { value: 'MEDICATION_SUSPENDED', label: 'Medicamento suspendido' },
    { value: 'EPS_CANCELLED', label: 'EPS canceló servicio' },
    { value: 'DUPLICATE', label: 'Duplicado' },
    { value: 'LOAD_ERROR', label: 'Error de carga' },
    { value: 'NOT_LOCATED', label: 'No localizado' },
    { value: 'OTHER', label: 'Otro' },
];
exports.PENDING_SUBREASONS = [
    { value: 'NO_ANSWER', label: 'No contestó' },
    { value: 'PHONE_OFF', label: 'Teléfono apagado' },
    { value: 'RESCHEDULE_CALL', label: 'Reagendar llamada' },
    { value: 'PENDING_AUTHORIZATION', label: 'Pendiente autorización' },
    { value: 'PENDING_VALIDATION', label: 'Pendiente validación' },
    { value: 'PENDING_ADDRESS', label: 'Pendiente dirección' },
    { value: 'OTHER', label: 'Otro' },
];
