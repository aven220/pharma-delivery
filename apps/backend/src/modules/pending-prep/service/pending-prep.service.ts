import { DeliveryStatus, Prisma } from '@prisma/client';
import { prisma } from '../../../infra/database/prisma';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { deliveryStatusService } from '../../deliveries/service/delivery-status.service';

const PREP_STATUSES: DeliveryStatus[] = ['LIBRE', 'EMPACADO', 'RECHAZADO'];

export class PendingPrepService {
  async list(filters: {
    status?: DeliveryStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.DeliveryWhereInput = {
      deletedAt: null,
      status: filters.status ? filters.status : { in: PREP_STATUSES },
      ...(filters.search?.trim() && {
        OR: [
          { deliveryNumber: { contains: filters.search.trim(), mode: 'insensitive' } },
          { documentNumber: { contains: filters.search.trim(), mode: 'insensitive' } },
          { patient: { documentId: { contains: filters.search.trim() } } },
          { patient: { firstName: { contains: filters.search.trim(), mode: 'insensitive' } } },
          { patient: { lastName: { contains: filters.search.trim(), mode: 'insensitive' } } },
          { items: { some: { medication: { code: { contains: filters.search.trim(), mode: 'insensitive' } } } } },
          { items: { some: { medication: { cum: { contains: filters.search.trim(), mode: 'insensitive' } } } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: {
          patient: true,
          items: { where: { deletedAt: null }, include: { medication: true } },
          statusLogs: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { changedBy: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async summary() {
    const [byStatus, byDispensacion, byCedula] = await Promise.all([
      prisma.delivery.groupBy({
        by: ['status'],
        where: { deletedAt: null, status: { in: PREP_STATUSES } },
        _count: { _all: true },
      }),
      prisma.delivery.groupBy({
        by: ['documentNumber'],
        where: { deletedAt: null, status: { in: PREP_STATUSES } },
        _count: { _all: true },
      }),
      prisma.delivery.findMany({
        where: { deletedAt: null, status: { in: PREP_STATUSES } },
        select: {
          patient: { select: { documentId: true, firstName: true, lastName: true } },
          status: true,
        },
      }),
    ]);

    const cedulaMap = new Map<string, { documentId: string; name: string; libre: number; empacado: number; rechazado: number }>();
    for (const row of byCedula) {
      const key = row.patient.documentId;
      const entry = cedulaMap.get(key) || {
        documentId: key,
        name: `${row.patient.firstName} ${row.patient.lastName}`.trim(),
        libre: 0,
        empacado: 0,
        rechazado: 0,
      };
      if (row.status === 'LIBRE') entry.libre++;
      if (row.status === 'EMPACADO') entry.empacado++;
      if (row.status === 'RECHAZADO') entry.rechazado++;
      cedulaMap.set(key, entry);
    }

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byDispensacion: byDispensacion
        .filter((r) => r.documentNumber)
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 50)
        .map((r) => ({ documentNumber: r.documentNumber, count: r._count._all })),
      byCedula: Array.from(cedulaMap.values()).sort(
        (a, b) => b.libre + b.empacado + b.rechazado - (a.libre + a.empacado + a.rechazado)
      ),
    };
  }

  async pack(
    deliveryId: string,
    userId: string,
    input: {
      observations?: string;
      items?: Array<{ itemId: string; lotNumber?: string }>;
      patientUpdates?: Partial<{
        address: string;
        neighborhood: string;
        city: string;
        addressDetail: string;
        phone: string;
        phoneAlt: string;
        phoneFamily: string;
        phoneAlternative: string;
      }>;
    }
  ) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
      include: { items: { where: { deletedAt: null } }, patient: true },
    });
    if (!delivery) throw new NotFoundError('Delivery');
    if (!['LIBRE', 'RECHAZADO'].includes(delivery.status)) {
      throw new ValidationError('Solo se pueden empacar pendientes en estado Libre o Rechazado reabierto');
    }

    return prisma.$transaction(async (tx) => {
      if (input.patientUpdates) {
        const patient = delivery.patient;
        const updates: Prisma.PatientUpdateInput = {};
        const logs: Prisma.PatientChangeLogCreateManyInput[] = [];
        const fields = [
          'address',
          'neighborhood',
          'city',
          'addressDetail',
          'phone',
          'phoneAlt',
          'phoneFamily',
          'phoneAlternative',
        ] as const;

        for (const field of fields) {
          const newVal = input.patientUpdates[field];
          if (newVal === undefined || newVal === '') continue;
          const oldVal = patient[field as keyof typeof patient] as string | null;
          if (oldVal === newVal) continue;
          (updates as Record<string, string>)[field] = newVal;
          logs.push({
            patientId: patient.id,
            field,
            oldValue: oldVal ?? null,
            newValue: newVal,
            changedById: userId,
          });
        }

        if (Object.keys(updates).length > 0) {
          await tx.patient.update({ where: { id: patient.id }, data: updates });
          if (logs.length > 0) await tx.patientChangeLog.createMany({ data: logs });
        }
      }

      if (input.items?.length) {
        for (const line of input.items) {
          const item = delivery.items.find((i) => i.id === line.itemId);
          if (!item) continue;
          if (line.lotNumber?.trim()) {
            await tx.deliveryItem.update({
              where: { id: line.itemId },
              data: { lotNumber: line.lotNumber.trim() },
            });
          }
        }
      }

      const updated = await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: 'EMPACADO' },
      });

      await deliveryStatusService.logStatusChange(tx, {
        deliveryId,
        fromStatus: delivery.status,
        toStatus: 'EMPACADO',
        action: 'PACK_COMPLETED',
        changedById: userId,
        observations: input.observations,
      });

      return updated;
    });
  }

  async reject(deliveryId: string, userId: string, observations: string) {
    if (!observations?.trim()) {
      throw new ValidationError('Debe indicar observación al rechazar el paquete');
    }

    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');
    if (delivery.status !== 'LIBRE') {
      throw new ValidationError('Solo se pueden rechazar pendientes en estado Libre');
    }

    return deliveryStatusService.transition(deliveryId, userId, {
      toStatus: 'RECHAZADO',
      action: 'PACK_REJECTED',
      observations: observations.trim(),
    });
  }

  async reopen(deliveryId: string, userId: string, observations?: string) {
    const delivery = await prisma.delivery.findFirst({
      where: { id: deliveryId, deletedAt: null },
    });
    if (!delivery) throw new NotFoundError('Delivery');
    if (delivery.status !== 'RECHAZADO') {
      throw new ValidationError('Solo se pueden reabrir paquetes rechazados');
    }

    return deliveryStatusService.transition(deliveryId, userId, {
      toStatus: 'LIBRE',
      action: 'PACK_REOPENED',
      observations,
    });
  }
}

export const pendingPrepService = new PendingPrepService();
