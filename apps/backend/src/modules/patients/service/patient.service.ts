import { DeliveryPriority } from '@prisma/client';
import { prisma } from '../../../infra/database/prisma';
import { generateHash, generateDeliveryNumber, paginate, buildPaginationMeta } from '@pharma/utils';
import { ConflictError, NotFoundError } from '../../../shared/errors/AppError';

interface MedicationInput {
  medicationCode: string;
  medicationName: string;
  quantity: number;
  lotNumber?: string;
  observations?: string;
}

export class PatientService {
  async list(page = 1, limit = 20, search?: string) {
    const { skip, take } = paginate(page, limit);
    const trimmed = search?.trim();
    const terms = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];

    const termMatches = (term: string) => ({
      OR: [
        { documentId: { contains: term, mode: 'insensitive' as const } },
        { firstName: { contains: term, mode: 'insensitive' as const } },
        { lastName: { contains: term, mode: 'insensitive' as const } },
        { phone: { contains: term, mode: 'insensitive' as const } },
      ],
    });

    const where = {
      deletedAt: null,
      ...(terms.length === 1 && { OR: termMatches(terms[0]).OR }),
      ...(terms.length > 1 && { AND: terms.map((term) => termMatches(term)) }),
    };

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take,
        include: { _count: { select: { deliveries: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        deliveries: {
          where: { deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { medication: true } } },
        },
      },
    });
    if (!patient) throw new NotFoundError('Patient');
    return patient;
  }

  private async createDeliveryWithItems(
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    patientId: string,
    input: {
      documentId: string;
      documentNumber?: string;
      priority?: DeliveryPriority;
      scheduledDate?: string;
      scheduledTime?: string;
      observations?: string;
      medications: MedicationInput[];
    }
  ) {
    const deliveryHash = generateHash(input.documentId, input.documentNumber || `MANUAL-${Date.now()}`);

    const delivery = await tx.delivery.create({
      data: {
        deliveryNumber: generateDeliveryNumber(),
        documentNumber: input.documentNumber,
        patientId,
        priority: input.priority || 'MEDIUM',
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        scheduledTime: input.scheduledTime,
        observations: input.observations,
        uniqueHash: deliveryHash,
        status: 'PENDING_CALL',
      },
    });

    const items = [];
    for (const med of input.medications) {
      let medication = await tx.medication.findFirst({
        where: { code: med.medicationCode, deletedAt: null },
      });
      if (!medication) {
        medication = await tx.medication.create({
          data: { code: med.medicationCode, name: med.medicationName },
        });
      }

      const itemHash = generateHash(delivery.id, medication.id, med.lotNumber || '', med.quantity);
      const item = await tx.deliveryItem.create({
        data: {
          deliveryId: delivery.id,
          medicationId: medication.id,
          quantity: med.quantity,
          lotNumber: med.lotNumber,
          observations: med.observations,
          uniqueHash: itemHash,
        },
        include: { medication: true },
      });
      items.push(item);
    }

    return { delivery, items };
  }

  async createManualWithDelivery(
    input: {
      documentId: string;
      documentType?: string;
      firstName: string;
      lastName: string;
      phone?: string;
      address: string;
      city?: string;
      neighborhood?: string;
      observations?: string;
      priority?: DeliveryPriority;
      scheduledDate?: string;
      scheduledTime?: string;
      documentNumber?: string;
      medications?: MedicationInput[];
    },
    options?: { rejectDuplicate?: boolean }
  ) {
    const patientHash = generateHash(input.documentId, input.documentType || 'CC');

    return prisma.$transaction(async (tx) => {
      const existing = await tx.patient.findFirst({ where: { uniqueHash: patientHash, deletedAt: null } });

      if (existing && options?.rejectDuplicate) {
        throw new ConflictError(
          `Ya existe un paciente registrado con el documento ${input.documentId}`
        );
      }

      const patient = existing
        ? await tx.patient.update({
            where: { id: existing.id },
            data: {
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone ?? existing.phone,
              address: input.address,
              city: input.city,
              neighborhood: input.neighborhood,
              notes: input.observations,
            },
          })
        : await tx.patient.create({
            data: {
              documentId: input.documentId,
              documentType: input.documentType || 'CC',
              firstName: input.firstName,
              lastName: input.lastName,
              phone: input.phone,
              address: input.address,
              city: input.city,
              neighborhood: input.neighborhood,
              notes: input.observations,
              uniqueHash: patientHash,
            },
          });

      if (!input.medications?.length) {
        return { patient, delivery: null, items: [] };
      }

      const medications = input.medications;
      const { delivery, items } = await this.createDeliveryWithItems(tx, patient.id, {
        documentId: input.documentId,
        documentNumber: input.documentNumber,
        priority: input.priority,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        observations: input.observations,
        medications,
      });
      return { patient, delivery, items };
    });
  }

  async createDeliveryForPatient(input: {
    patientId?: string;
    newPatient?: {
      documentId: string;
      documentType?: string;
      firstName: string;
      lastName: string;
      phone?: string;
      address: string;
      city?: string;
      neighborhood?: string;
    };
    priority?: DeliveryPriority;
    observations?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    documentNumber?: string;
    medications: MedicationInput[];
  }) {
    if (input.newPatient) {
      return this.createManualWithDelivery(
        {
          ...input.newPatient,
          observations: input.observations,
          priority: input.priority,
          scheduledDate: input.scheduledDate,
          scheduledTime: input.scheduledTime,
          documentNumber: input.documentNumber,
          medications: input.medications,
        },
        { rejectDuplicate: true }
      );
    }

    const patient = await prisma.patient.findFirst({ where: { id: input.patientId, deletedAt: null } });
    if (!patient) throw new NotFoundError('Patient');

    return prisma.$transaction(async (tx) => {
      const { delivery, items } = await this.createDeliveryWithItems(tx, patient.id, {
        documentId: patient.documentId,
        documentNumber: input.documentNumber,
        priority: input.priority,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        observations: input.observations,
        medications: input.medications,
      });
      return { patient, delivery, items };
    });
  }

  async getFullHistory(id: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, deletedAt: null },
    });
    if (!patient) throw new NotFoundError('Patient');

    const [changeLogs, deliveries, callHistory, incidents, statusLogs] = await Promise.all([
      prisma.patientChangeLog.findMany({
        where: { patientId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      prisma.delivery.findMany({
        where: { patientId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { medication: true } },
          assignments: { include: { courier: { select: { firstName: true, lastName: true } } } },
          evidence: true,
        },
      }),
      prisma.callHistory.findMany({
        where: { patientId: id },
        orderBy: { calledAt: 'desc' },
        include: {
          operator: { include: { user: { select: { firstName: true, lastName: true } } } },
          delivery: { select: { deliveryNumber: true } },
        },
      }),
      prisma.incident.findMany({
        where: { delivery: { patientId: id }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          delivery: { select: { deliveryNumber: true } },
          reportedBy: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.deliveryStatusLog.findMany({
        where: { delivery: { patientId: id } },
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: { select: { firstName: true, lastName: true } },
          delivery: { select: { deliveryNumber: true } },
        },
      }),
    ]);

    return { patient, changeLogs, deliveries, callHistory, incidents, statusLogs };
  }
}

export const patientService = new PatientService();
