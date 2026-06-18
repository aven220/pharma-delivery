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
    const prepWhere = { deletedAt: null, status: { in: PREP_STATUSES } };

    const [byStatus, byDispensacion, byCedulaRows, totalCedulas] = await Promise.all([
      prisma.delivery.groupBy({
        by: ['status'],
        where: prepWhere,
        _count: { _all: true },
      }),
      prisma.delivery.groupBy({
        by: ['documentNumber'],
        where: prepWhere,
        _count: { _all: true },
      }),
      prisma.$queryRaw<
        Array<{
          document_id: string;
          first_name: string;
          last_name: string;
          libre: number;
          empacado: number;
          rechazado: number;
        }>
      >`
        SELECT
          p.document_id,
          p.first_name,
          p.last_name,
          SUM(CASE WHEN d.status = 'LIBRE' THEN 1 ELSE 0 END)::int AS libre,
          SUM(CASE WHEN d.status = 'EMPACADO' THEN 1 ELSE 0 END)::int AS empacado,
          SUM(CASE WHEN d.status = 'RECHAZADO' THEN 1 ELSE 0 END)::int AS rechazado
        FROM deliveries d
        INNER JOIN patients p ON p.id = d.patient_id
        WHERE d.deleted_at IS NULL
          AND d.status IN ('LIBRE', 'EMPACADO', 'RECHAZADO')
        GROUP BY p.document_id, p.first_name, p.last_name
        ORDER BY (
          SUM(CASE WHEN d.status = 'LIBRE' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN d.status = 'EMPACADO' THEN 1 ELSE 0 END) +
          SUM(CASE WHEN d.status = 'RECHAZADO' THEN 1 ELSE 0 END)
        ) DESC
        LIMIT 50
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT d.patient_id)::bigint AS count
        FROM deliveries d
        WHERE d.deleted_at IS NULL
          AND d.status IN ('LIBRE', 'EMPACADO', 'RECHAZADO')
      `,
    ]);

    return {
      byStatus: byStatus.map((r) => ({ status: r.status, count: r._count._all })),
      byDispensacion: byDispensacion
        .filter((r) => r.documentNumber)
        .sort((a, b) => b._count._all - a._count._all)
        .slice(0, 50)
        .map((r) => ({ documentNumber: r.documentNumber, count: r._count._all })),
      byCedula: byCedulaRows.map((r) => ({
        documentId: r.document_id,
        name: r.last_name === '.' ? r.first_name : `${r.first_name} ${r.last_name}`.trim(),
        libre: r.libre,
        empacado: r.empacado,
        rechazado: r.rechazado,
      })),
      totalCedulas: Number(totalCedulas[0]?.count ?? 0),
      cedulaLimit: 50,
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
