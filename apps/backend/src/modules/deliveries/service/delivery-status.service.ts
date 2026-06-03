import {
  DeactivationReason,
  DeliveryStatus,
  PendingSubreason,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../infra/database/prisma';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';

const ASSIGNABLE_STATUSES: DeliveryStatus[] = ['CONFIRMED_FOR_DELIVERY', 'SCHEDULED'];

export class DeliveryStatusService {
  async logStatusChange(
    tx: Prisma.TransactionClient,
    input: {
      deliveryId: string;
      fromStatus: DeliveryStatus | null;
      toStatus: DeliveryStatus;
      action: string;
      changedById: string;
      observations?: string;
      deactivationReason?: DeactivationReason;
      pendingSubreason?: PendingSubreason;
    }
  ) {
    return tx.deliveryStatusLog.create({ data: input });
  }

  async getHistory(deliveryId: string) {
    return prisma.deliveryStatusLog.findMany({
      where: { deliveryId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });
  }

  async transition(
    deliveryId: string,
    userId: string,
    input: {
      toStatus: DeliveryStatus;
      action: string;
      observations?: string;
      deactivationReason?: DeactivationReason;
      pendingSubreason?: PendingSubreason;
      scheduledDate?: string;
      scheduledTime?: string;
    }
  ) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');

    return prisma.$transaction(async (tx) => {
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

  async confirmForDelivery(deliveryId: string, userId: string, observations?: string) {
    return this.transition(deliveryId, userId, {
      toStatus: 'CONFIRMED_FOR_DELIVERY',
      action: 'CONFIRM_FOR_DELIVERY',
      observations,
    });
  }

  async setPending(
    deliveryId: string,
    userId: string,
    pendingSubreason: PendingSubreason,
    observations?: string
  ) {
    if (!observations?.trim()) {
      throw new ValidationError('Debe indicar observación al marcar como pendiente');
    }
    return this.transition(deliveryId, userId, {
      toStatus: 'PENDING_CALL',
      action: 'SET_PENDING',
      pendingSubreason,
      observations,
    });
  }

  async deactivate(
    deliveryId: string,
    userId: string,
    deactivationReason: DeactivationReason,
    observations?: string
  ) {
    if (!observations?.trim() && deactivationReason === 'OTHER') {
      throw new ValidationError('Debe indicar observación para dar de baja');
    }
    return this.transition(deliveryId, userId, {
      toStatus: 'CANCELLED',
      action: 'DEACTIVATE',
      deactivationReason,
      observations,
    });
  }

  async reactivate(deliveryId: string, userId: string, observations?: string) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');
    if (delivery.status !== 'CANCELLED') {
      throw new ValidationError('Solo se pueden reactivar entregas dadas de baja');
    }
    return this.transition(deliveryId, userId, {
      toStatus: 'PENDING_CALL',
      action: 'REACTIVATE',
      observations,
    });
  }

  async markCallCompleted(deliveryId: string, userId: string) {
    const delivery = await prisma.delivery.findFirst({ where: { id: deliveryId, deletedAt: null } });
    if (!delivery) throw new NotFoundError('Delivery');
    if (['CONFIRMED_FOR_DELIVERY', 'CANCELLED', 'DELIVERED'].includes(delivery.status)) {
      return delivery;
    }
    return this.transition(deliveryId, userId, {
      toStatus: 'CALL_COMPLETED',
      action: 'CALL_COMPLETED',
    });
  }

  canAssignToCourier(status: DeliveryStatus): boolean {
    return ASSIGNABLE_STATUSES.includes(status);
  }
}

export const deliveryStatusService = new DeliveryStatusService();

export const DEACTIVATION_REASONS: Array<{ value: DeactivationReason; label: string }> = [
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

export const PENDING_SUBREASONS: Array<{ value: PendingSubreason; label: string }> = [
  { value: 'NO_ANSWER', label: 'No contestó' },
  { value: 'PHONE_OFF', label: 'Teléfono apagado' },
  { value: 'RESCHEDULE_CALL', label: 'Reagendar llamada' },
  { value: 'PENDING_AUTHORIZATION', label: 'Pendiente autorización' },
  { value: 'PENDING_VALIDATION', label: 'Pendiente validación' },
  { value: 'PENDING_ADDRESS', label: 'Pendiente dirección' },
  { value: 'OTHER', label: 'Otro' },
];
