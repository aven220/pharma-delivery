"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patientService = exports.PatientService = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const utils_1 = require("@pharma/utils");
const AppError_1 = require("../../../shared/errors/AppError");
class PatientService {
    async list(page = 1, limit = 20, search) {
        const { skip, take } = (0, utils_1.paginate)(page, limit);
        const trimmed = search?.trim();
        const terms = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
        const termMatches = (term) => ({
            OR: [
                { documentId: { contains: term, mode: 'insensitive' } },
                { firstName: { contains: term, mode: 'insensitive' } },
                { lastName: { contains: term, mode: 'insensitive' } },
                { phone: { contains: term, mode: 'insensitive' } },
            ],
        });
        const where = {
            deletedAt: null,
            ...(terms.length === 1 && { OR: termMatches(terms[0]).OR }),
            ...(terms.length > 1 && { AND: terms.map((term) => termMatches(term)) }),
        };
        const [data, total] = await Promise.all([
            prisma_1.prisma.patient.findMany({
                where,
                skip,
                take,
                include: { _count: { select: { deliveries: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.patient.count({ where }),
        ]);
        return { data, meta: (0, utils_1.buildPaginationMeta)(total, page, limit) };
    }
    async getById(id) {
        const patient = await prisma_1.prisma.patient.findFirst({
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
        if (!patient)
            throw new AppError_1.NotFoundError('Patient');
        return patient;
    }
    async createDeliveryWithItems(tx, patientId, input) {
        const deliveryHash = (0, utils_1.generateHash)(input.documentId, input.documentNumber || `MANUAL-${Date.now()}`);
        const delivery = await tx.delivery.create({
            data: {
                deliveryNumber: (0, utils_1.generateDeliveryNumber)(),
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
            const itemHash = (0, utils_1.generateHash)(delivery.id, medication.id, med.lotNumber || '', med.quantity);
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
    async createManualWithDelivery(input, options) {
        const patientHash = (0, utils_1.generateHash)(input.documentId, input.documentType || 'CC');
        return prisma_1.prisma.$transaction(async (tx) => {
            const existing = await tx.patient.findFirst({ where: { uniqueHash: patientHash, deletedAt: null } });
            if (existing && options?.rejectDuplicate) {
                throw new AppError_1.ConflictError(`Ya existe un paciente registrado con el documento ${input.documentId}`);
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
    async createDeliveryForPatient(input) {
        if (input.newPatient) {
            return this.createManualWithDelivery({
                ...input.newPatient,
                observations: input.observations,
                priority: input.priority,
                scheduledDate: input.scheduledDate,
                scheduledTime: input.scheduledTime,
                documentNumber: input.documentNumber,
                medications: input.medications,
            }, { rejectDuplicate: true });
        }
        const patient = await prisma_1.prisma.patient.findFirst({ where: { id: input.patientId, deletedAt: null } });
        if (!patient)
            throw new AppError_1.NotFoundError('Patient');
        return prisma_1.prisma.$transaction(async (tx) => {
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
    async getFullHistory(id) {
        const patient = await prisma_1.prisma.patient.findFirst({
            where: { id, deletedAt: null },
        });
        if (!patient)
            throw new AppError_1.NotFoundError('Patient');
        const [changeLogs, deliveries, callHistory, incidents, statusLogs] = await Promise.all([
            prisma_1.prisma.patientChangeLog.findMany({
                where: { patientId: id },
                orderBy: { createdAt: 'desc' },
                include: {
                    changedBy: { select: { firstName: true, lastName: true, email: true } },
                },
            }),
            prisma_1.prisma.delivery.findMany({
                where: { patientId: id, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { medication: true } },
                    assignments: { include: { courier: { select: { firstName: true, lastName: true } } } },
                    evidence: true,
                },
            }),
            prisma_1.prisma.callHistory.findMany({
                where: { patientId: id },
                orderBy: { calledAt: 'desc' },
                include: {
                    operator: { include: { user: { select: { firstName: true, lastName: true } } } },
                    delivery: { select: { deliveryNumber: true } },
                },
            }),
            prisma_1.prisma.incident.findMany({
                where: { delivery: { patientId: id }, deletedAt: null },
                orderBy: { createdAt: 'desc' },
                include: {
                    delivery: { select: { deliveryNumber: true } },
                    reportedBy: { select: { firstName: true, lastName: true } },
                },
            }),
            prisma_1.prisma.deliveryStatusLog.findMany({
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
exports.PatientService = PatientService;
exports.patientService = new PatientService();
