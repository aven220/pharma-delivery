import {
  CallManagementResult,
  CallQueueStatus,
  CallResult,
  Prisma,
} from '@prisma/client';
import { BrandConfig } from '../../../config/brand';
import { prisma } from '../../../infra/database/prisma';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import { deliveryStatusService } from '../../deliveries/service/delivery-status.service';
import { createUserNotification } from '../../notifications/notification.service';

const PENDING_CALL_STATUSES = ['EMPACADO', 'PENDING_CALL', 'PENDING', 'CALL_COMPLETED', 'RESCHEDULED'] as const;

const TERMINAL_DELIVERY_STATUSES = ['DELIVERED', 'CANCELLED', 'RETURNED'] as const;

function assertDeliveryCallable(status: string) {
  if (status === 'DELIVERED') {
    throw new ValidationError('Esta entrega ya fue completada.');
  }
  if (status === 'CANCELLED') {
    throw new ValidationError('Esta entrega fue cancelada o dada de baja.');
  }
  if (status === 'RETURNED') {
    throw new ValidationError('Esta entrega fue devuelta.');
  }
}

function formatPatientDisplayName(patient: { firstName: string; lastName: string }) {
  return patient.lastName === '.'
    ? patient.firstName
    : `${patient.firstName} ${patient.lastName}`.trim();
}

const STATUS_TO_CALL_RESULT: Partial<Record<CallQueueStatus, CallResult>> = {
  ANSWERED: 'ANSWERED',
  NO_ANSWER: 'NO_ANSWER',
  OFF: 'OFF',
  WRONG_NUMBER: 'WRONG_NUMBER',
  RESCHEDULE: 'RESCHEDULE',
  CONFIRMED: 'CONFIRMED',
};

const TRACKED_PATIENT_FIELDS = [
  'address',
  'neighborhood',
  'city',
  'addressDetail',
  'phone',
  'phoneAlt',
  'phoneFamily',
  'phoneAlternative',
] as const;

export class CallAssignmentService {
  async listPendingCalls(page = 1, limit = 50, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.DeliveryWhereInput = {
      deletedAt: null,
      status: { in: [...PENDING_CALL_STATUSES] },
      ...(search?.trim() && {
        OR: [
          { deliveryNumber: { contains: search.trim(), mode: 'insensitive' } },
          { documentNumber: { contains: search.trim(), mode: 'insensitive' } },
          { patient: { firstName: { contains: search.trim(), mode: 'insensitive' } } },
          { patient: { lastName: { contains: search.trim(), mode: 'insensitive' } } },
          { patient: { documentId: { contains: search.trim() } } },
          { patient: { phone: { contains: search.trim() } } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          patient: true,
          items: { include: { medication: true }, where: { deletedAt: null } },
          callAssignments: {
            where: { deletedAt: null, completedAt: null },
            include: { operator: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      prisma.delivery.count({ where }),
    ]);

    return {
      data: data
        .map((d) => ({
          id: d.id,
          deliveryNumber: d.deliveryNumber,
          documentNumber: d.documentNumber,
          status: d.status,
          observations: d.observations,
          createdAt: d.createdAt,
          patient: d.patient,
          medications: d.items.map((i) => ({
            name: i.medication.name,
            code: i.medication.code,
            cum: i.medication.cum,
            quantity: i.quantity,
          })),
          assignedOperator: d.callAssignments[0]?.operator ?? null,
        }))
        .sort((a, b) => {
          const aAssigned = a.assignedOperator ? 1 : 0;
          const bAssigned = b.assignedOperator ? 1 : 0;
          if (aAssigned !== bAssigned) return aAssigned - bAssigned;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async assignToOperator(
    deliveryIds: string[],
    operatorUserId: string,
    assignedById: string
  ) {
    const operator = await prisma.user.findFirst({
      where: { id: operatorUserId, deletedAt: null },
      include: { operatorProfile: true, role: true },
    });
    if (!operator?.operatorProfile) throw new NotFoundError('Operator');

    const assignments = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const deliveryId of deliveryIds) {
        const delivery = await tx.delivery.findFirst({
          where: { id: deliveryId, deletedAt: null },
        });
        if (!delivery) throw new NotFoundError(`Delivery ${deliveryId}`);
        if (TERMINAL_DELIVERY_STATUSES.includes(delivery.status as (typeof TERMINAL_DELIVERY_STATUSES)[number])) {
          assertDeliveryCallable(delivery.status);
        }
        if (!PENDING_CALL_STATUSES.includes(delivery.status as (typeof PENDING_CALL_STATUSES)[number])) {
          throw new ValidationError(`La entrega ${delivery.deliveryNumber} no está lista para llamada (debe estar empacada)`);
        }

        if (delivery.status === 'EMPACADO') {
          await tx.delivery.update({
            where: { id: deliveryId },
            data: { status: 'PENDING_CALL' },
          });
          await deliveryStatusService.logStatusChange(tx, {
            deliveryId,
            fromStatus: 'EMPACADO',
            toStatus: 'PENDING_CALL',
            action: 'ASSIGNED_TO_CALL',
            changedById: assignedById,
          });
        }

        await tx.callAssignment.updateMany({
          where: {
            deliveryId,
            deletedAt: null,
            completedAt: null,
          },
          data: { deletedAt: new Date() },
        });

        const assignment = await tx.callAssignment.create({
          data: {
            deliveryId,
            operatorUserId,
            assignedById,
            status: 'PENDING',
          },
          include: {
            delivery: {
              include: {
                patient: true,
              },
            },
            operator: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        });
        results.push(assignment);
      }
      return results;
    });

    if (assignments.length > 0) {
      const lines = assignments.map((a) => {
        const doc = a.delivery.documentNumber || a.delivery.deliveryNumber;
        const name = formatPatientDisplayName(a.delivery.patient);
        return `${doc} — ${name}`;
      });
      const extra = lines.length > 3 ? ` (+${lines.length - 3} más)` : '';
      await createUserNotification({
        userId: operatorUserId,
        type: 'ASSIGNMENT',
        title: `${BrandConfig.notificationPrefix}: ${
          assignments.length === 1 ? 'Nueva llamada asignada' : `${assignments.length} llamadas asignadas`
        }`,
        body: lines.slice(0, 3).join('; ') + extra,
        data: {
          kind: 'CALL_ASSIGNMENT',
          tab: 'my-calls',
          count: assignments.length,
          assignmentIds: assignments.map((a) => a.id),
          deliveryIds: assignments.map((a) => a.deliveryId),
        },
        sendPush: false,
      });
    }

    return assignments;
  }

  async listMyCalls(
    operatorUserId: string,
    filters: { status?: CallQueueStatus; page?: number; limit?: number },
    options?: { allOperators?: boolean }
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CallAssignmentWhereInput = {
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(!options?.allOperators && { operatorUserId }),
    };

    const [data, total] = await Promise.all([
      prisma.callAssignment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ status: 'asc' }, { assignedAt: 'desc' }],
        include: {
          delivery: {
            include: {
              patient: true,
              items: { include: { medication: true }, where: { deletedAt: null } },
              callHistory: {
                take: 5,
                orderBy: { calledAt: 'desc' },
              },
              evidence: {
                where: { deletedAt: null },
                select: { id: true, fileName: true, type: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
              },
              assignments: {
                where: {
                  deletedAt: null,
                  status: { notIn: ['CANCELLED', 'REASSIGNED'] },
                },
                orderBy: { assignedAt: 'desc' },
                take: 1,
                include: {
                  courier: { select: { id: true, firstName: true, lastName: true } },
                  route: { select: { id: true, routeDate: true } },
                  intermunicipalRoute: { select: { id: true, routeCode: true, routeDate: true } },
                },
              },
            },
          },
        },
      }),
      prisma.callAssignment.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        ...a,
        previousObservations: a.delivery.observations,
        patient: a.delivery.patient,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateAssignment(
    assignmentId: string,
    operatorUserId: string,
    input: {
      status?: CallQueueStatus;
      managementResult?: CallManagementResult;
      observations?: string;
      callDate?: string;
      callTime?: string;
      durationSec?: number;
      phoneUsed?: string;
      skipDialJustification?: string;
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
      rescheduleDate?: string;
      rescheduleTime?: string;
      action?: 'CONFIRM' | 'PENDING' | 'DEACTIVATE' | 'REACTIVATE' | 'RESCHEDULE';
      deactivationReason?: import('@prisma/client').DeactivationReason;
      pendingSubreason?: import('@prisma/client').PendingSubreason;
    },
    options?: { bypassOperatorCheck?: boolean; actingUserId?: string }
  ) {
    const assignment = await prisma.callAssignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
        ...(options?.bypassOperatorCheck ? {} : { operatorUserId }),
      },
      include: {
        delivery: { include: { patient: true } },
      },
    });
    if (!assignment) throw new NotFoundError('Call assignment');

    assertDeliveryCallable(assignment.delivery.status);

    const auditUserId = options?.actingUserId ?? operatorUserId;
    const callOperatorUserId = assignment.operatorUserId;

    const isComplete =
      input.managementResult !== undefined ||
      input.action !== undefined ||
      input.status === 'CONFIRMED' ||
      ['WRONG_NUMBER', 'OFF'].includes(input.status || '');

    if (isComplete && !assignment.dialClickedAt && assignment.dialClickCount === 0) {
      const justification = input.skipDialJustification?.trim();
      if (!justification || justification.length < 10) {
        throw new ValidationError(
          'Debe pulsar "Llamar ahora" antes de guardar, o escriba una justificación (mín. 10 caracteres) si no pudo marcar.'
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      if (input.patientUpdates) {
        const patient = assignment.delivery.patient;
        const updates: Prisma.PatientUpdateInput = {};
        const logs: Prisma.PatientChangeLogCreateManyInput[] = [];

        for (const field of TRACKED_PATIENT_FIELDS) {
          const newVal = input.patientUpdates[field];
          if (newVal === undefined) continue;
          const oldVal = patient[field as keyof typeof patient] as string | null;
          if (oldVal === newVal) continue;
          (updates as Record<string, string>)[field] = newVal;
          logs.push({
            patientId: patient.id,
            field,
            oldValue: oldVal ?? null,
            newValue: newVal,
            changedById: auditUserId,
          });
        }

        if (Object.keys(updates).length > 0) {
          await tx.patient.update({ where: { id: patient.id }, data: updates });
          if (logs.length > 0) {
            await tx.patientChangeLog.createMany({ data: logs });
          }
        }
      }

      const operator = await tx.operator.findFirst({
        where: { userId: callOperatorUserId },
      });
      if (!operator) throw new NotFoundError('Operator');

      if (input.status && input.status !== 'PENDING' && input.phoneUsed) {
        const callResult = STATUS_TO_CALL_RESULT[input.status];
        if (callResult) {
          await tx.callHistory.create({
            data: {
              deliveryId: assignment.deliveryId,
              patientId: assignment.delivery.patientId,
              operatorId: operator.id,
              phoneUsed: input.phoneUsed,
              result: callResult,
              durationSec: input.durationSec,
              observations: input.observations,
              rescheduleDate: input.rescheduleDate ? new Date(input.rescheduleDate) : undefined,
              rescheduleTime: input.rescheduleTime,
            },
          });
        }
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'CALL_COMPLETED',
          action: 'CALL_REGISTERED',
          changedById: auditUserId,
          observations: input.observations,
        });
        await tx.delivery.update({
          where: { id: assignment.deliveryId },
          data: { status: 'CALL_COMPLETED' },
        });
      }

      if (input.action === 'DEACTIVATE' && input.deactivationReason) {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'CANCELLED',
          action: 'DEACTIVATE',
          changedById: auditUserId,
          observations: input.observations,
          deactivationReason: input.deactivationReason,
        });
        await tx.delivery.update({
          where: { id: assignment.deliveryId },
          data: { status: 'CANCELLED', failureReason: input.observations },
        });
      } else if (input.action === 'PENDING' && input.pendingSubreason) {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'PENDING_CALL',
          action: 'SET_PENDING',
          changedById: auditUserId,
          observations: input.observations,
          pendingSubreason: input.pendingSubreason,
        });
        await tx.delivery.update({
          where: { id: assignment.deliveryId },
          data: { status: 'PENDING_CALL' },
        });
      } else if (input.managementResult === 'CONFIRMED_FOR_DELIVERY' || input.action === 'CONFIRM') {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'CONFIRMED_FOR_DELIVERY',
          action: 'CONFIRM_FOR_DELIVERY',
          changedById: auditUserId,
          observations: input.observations,
        });
        await tx.delivery.update({
          where: { id: assignment.deliveryId },
          data: { status: 'CONFIRMED_FOR_DELIVERY' },
        });
      } else if (input.managementResult === 'SERVICE_REJECTED') {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'CANCELLED',
          action: 'DEACTIVATE',
          changedById: auditUserId,
          observations: input.observations,
          deactivationReason: 'TREATMENT_REJECTED',
        });
        await tx.delivery.update({
          where: { id: assignment.deliveryId },
          data: { status: 'CANCELLED' },
        });
      } else if (input.managementResult === 'WRONG_NUMBER') {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'PENDING_CALL',
          action: 'SET_PENDING',
          changedById: auditUserId,
          observations: input.observations,
          pendingSubreason: 'NO_ANSWER',
        });
        await tx.delivery.update({ where: { id: assignment.deliveryId }, data: { status: 'PENDING_CALL' } });
      } else if (
        input.managementResult === 'RESCHEDULE' ||
        input.status === 'RESCHEDULE' ||
        input.action === 'RESCHEDULE'
      ) {
        if (input.rescheduleDate) {
          await deliveryStatusService.logStatusChange(tx, {
            deliveryId: assignment.deliveryId,
            fromStatus: assignment.delivery.status,
            toStatus: 'RESCHEDULED',
            action: 'RESCHEDULE',
            changedById: auditUserId,
            observations: input.observations,
            pendingSubreason: 'RESCHEDULE_CALL',
          });
          await tx.delivery.update({
            where: { id: assignment.deliveryId },
            data: {
              status: 'RESCHEDULED',
              scheduledDate: new Date(input.rescheduleDate),
              scheduledTime: input.rescheduleTime,
            },
          });
        }
      } else if (input.managementResult === 'NOT_LOCATED') {
        await deliveryStatusService.logStatusChange(tx, {
          deliveryId: assignment.deliveryId,
          fromStatus: assignment.delivery.status,
          toStatus: 'PENDING_CALL',
          action: 'SET_PENDING',
          changedById: auditUserId,
          observations: input.observations,
          pendingSubreason: 'NO_ANSWER',
        });
        await tx.delivery.update({ where: { id: assignment.deliveryId }, data: { status: 'PENDING_CALL' } });
      }

      const obsWithDialNote =
        !assignment.dialClickedAt &&
        assignment.dialClickCount === 0 &&
        input.skipDialJustification?.trim()
          ? `${input.observations ? `${input.observations}\n` : ''}[Sin marcar] ${input.skipDialJustification.trim()}`
          : input.observations;

      const updated = await tx.callAssignment.update({
        where: { id: assignmentId },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.managementResult && { managementResult: input.managementResult }),
          ...(obsWithDialNote !== undefined && { observations: obsWithDialNote }),
          ...(input.callDate && { callDate: new Date(input.callDate) }),
          ...(input.callTime && { callTime: input.callTime }),
          ...(input.durationSec !== undefined && { durationSec: input.durationSec }),
          ...(input.phoneUsed && { phoneUsed: input.phoneUsed }),
          ...(isComplete && { completedAt: new Date() }),
        },
        include: {
          delivery: { include: { patient: true } },
        },
      });

      return updated;
    });
  }

  async registerDialClick(
    assignmentId: string,
    operatorUserId: string,
    phone?: string,
    options?: { bypassOperatorCheck?: boolean }
  ) {
    const assignment = await prisma.callAssignment.findFirst({
      where: {
        id: assignmentId,
        deletedAt: null,
        ...(options?.bypassOperatorCheck ? {} : { operatorUserId }),
      },
      include: { delivery: { include: { patient: true } } },
    });
    if (!assignment) throw new NotFoundError('Call assignment');
    assertDeliveryCallable(assignment.delivery.status);

    const phoneUsed =
      phone?.trim() ||
      assignment.phoneUsed ||
      assignment.delivery.patient.phone ||
      assignment.delivery.patient.phoneAlt ||
      'unknown';

    return prisma.callAssignment.update({
      where: { id: assignmentId },
      data: {
        dialClickedAt: assignment.dialClickedAt ?? new Date(),
        dialClickCount: { increment: 1 },
        phoneUsed,
        callDate: assignment.callDate ?? new Date(),
        callTime:
          assignment.callTime ??
          new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      },
    });
  }

  async getOperatorMonitoring(dateFrom?: Date, dateTo?: Date) {
    const start =
      dateFrom ??
      (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      })();
    const end = dateTo ?? new Date();

    const completed = await prisma.callAssignment.findMany({
      where: {
        deletedAt: null,
        completedAt: { gte: start, lte: end },
      },
      select: {
        id: true,
        operatorUserId: true,
        dialClickedAt: true,
        dialClickCount: true,
        durationSec: true,
        managementResult: true,
        completedAt: true,
        observations: true,
        operator: { select: { firstName: true, lastName: true } },
      },
    });

    type Agg = {
      operatorId: string;
      name: string;
      total: number;
      withDial: number;
      withoutDial: number;
      shortDuration: number;
      avgDurationSec: number;
      alertLevel: 'green' | 'yellow' | 'red';
      durationSum: number;
      durationCount: number;
    };

    const byOp = new Map<string, Agg>();

    for (const row of completed) {
      const key = row.operatorUserId;
      let agg = byOp.get(key);
      if (!agg) {
        agg = {
          operatorId: key,
          name: `${row.operator.firstName} ${row.operator.lastName}`,
          total: 0,
          withDial: 0,
          withoutDial: 0,
          shortDuration: 0,
          avgDurationSec: 0,
          alertLevel: 'green',
          durationSum: 0,
          durationCount: 0,
        };
        byOp.set(key, agg);
      }
      agg.total += 1;
      const dialed = !!(row.dialClickedAt || row.dialClickCount > 0);
      if (dialed) agg.withDial += 1;
      else agg.withoutDial += 1;
      if (typeof row.durationSec === 'number') {
        agg.durationSum += row.durationSec;
        agg.durationCount += 1;
        if (row.durationSec < 5 && row.managementResult === 'CONFIRMED_FOR_DELIVERY') {
          agg.shortDuration += 1;
        }
      }
    }

    const operators = Array.from(byOp.values()).map((agg) => {
      const avgDurationSec =
        agg.durationCount > 0 ? Math.round(agg.durationSum / agg.durationCount) : 0;
      const noDialPct = agg.total > 0 ? agg.withoutDial / agg.total : 0;
      let alertLevel: 'green' | 'yellow' | 'red' = 'green';
      if (noDialPct >= 0.4 || agg.shortDuration >= 3) alertLevel = 'red';
      else if (noDialPct >= 0.15 || agg.shortDuration >= 1) alertLevel = 'yellow';
      return {
        operatorId: agg.operatorId,
        name: agg.name,
        total: agg.total,
        withDial: agg.withDial,
        withoutDial: agg.withoutDial,
        dialRate: agg.total > 0 ? Math.round((agg.withDial / agg.total) * 100) : 0,
        shortDuration: agg.shortDuration,
        avgDurationSec,
        alertLevel,
      };
    });

    return {
      dateFrom: start.toISOString(),
      dateTo: end.toISOString(),
      totalCompleted: completed.length,
      alerts: {
        withoutDial: completed.filter((c) => !c.dialClickedAt && c.dialClickCount === 0).length,
        shortDuration: completed.filter(
          (c) =>
            typeof c.durationSec === 'number' &&
            c.durationSec < 5 &&
            c.managementResult === 'CONFIRMED_FOR_DELIVERY'
        ).length,
      },
      operators: operators.sort((a, b) => b.total - a.total),
    };
  }

  async getManagementStats(dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.CallAssignmentWhereInput = {
      deletedAt: null,
      managementResult: { not: null },
      ...(dateFrom || dateTo
        ? {
            completedAt: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          }
        : {}),
    };

    const [total, byResult, byOperator] = await Promise.all([
      prisma.callAssignment.count({ where }),
      prisma.callAssignment.groupBy({
        by: ['managementResult'],
        where,
        _count: true,
      }),
      prisma.callAssignment.groupBy({
        by: ['operatorUserId'],
        where,
        _count: true,
      }),
    ]);

    const operators = await Promise.all(
      byOperator.map(async (op) => {
        const user = await prisma.user.findUnique({
          where: { id: op.operatorUserId },
          select: { firstName: true, lastName: true },
        });
        const confirmed = await prisma.callAssignment.count({
          where: {
            ...where,
            operatorUserId: op.operatorUserId,
            managementResult: 'CONFIRMED_FOR_DELIVERY',
          },
        });
        return {
          operatorId: op.operatorUserId,
          name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          total: op._count,
          confirmed,
          effectiveness: op._count > 0 ? Math.round((confirmed / op._count) * 100) : 0,
        };
      })
    );

    return {
      total,
      byResult: byResult.map((r) => ({
        result: r.managementResult,
        count: r._count,
      })),
      operators,
    };
  }

  async listOperators() {
    const operators = await prisma.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        operatorProfile: { isNot: null },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        operatorProfile: { select: { code: true } },
      },
    });

    const workload = await prisma.callAssignment.groupBy({
      by: ['operatorUserId'],
      where: {
        deletedAt: null,
        completedAt: null,
        status: { in: ['PENDING', 'CALLED', 'ANSWERED', 'NO_ANSWER', 'OFF', 'WRONG_NUMBER', 'RESCHEDULE'] },
      },
      _count: { _all: true },
    });

    const loadMap = new Map(workload.map((w) => [w.operatorUserId, w._count._all]));

    return operators
      .map((op) => ({
        ...op,
        pendingCalls: loadMap.get(op.id) ?? 0,
      }))
      .sort((a, b) => a.pendingCalls - b.pendingCalls);
  }
}

export const callAssignmentService = new CallAssignmentService();
