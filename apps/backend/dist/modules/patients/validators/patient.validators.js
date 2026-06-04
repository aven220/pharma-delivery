"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDeliveryManualSchema = exports.patientIdSchema = exports.listPatientsSchema = exports.createPatientManualSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const medicationItemSchema = zod_1.z.object({
    medicationCode: zod_1.z.string().min(1),
    medicationName: zod_1.z.string().min(1),
    quantity: zod_1.z.coerce.number().int().min(1).default(1),
    lotNumber: zod_1.z.string().optional(),
    observations: zod_1.z.string().optional(),
});
exports.createPatientManualSchema = zod_1.z.object({
    body: zod_1.z.object({
        documentId: zod_1.z.string().min(1),
        documentType: zod_1.z.string().default('CC'),
        firstName: zod_1.z.string().min(1),
        lastName: zod_1.z.string().min(1),
        phone: zod_1.z.string().optional(),
        address: zod_1.z.string().min(1),
        city: zod_1.z.string().optional(),
        neighborhood: zod_1.z.string().optional(),
        observations: zod_1.z.string().optional(),
        priority: zod_1.z.nativeEnum(client_1.DeliveryPriority).default('MEDIUM'),
        scheduledDate: zod_1.z.string().optional(),
        scheduledTime: zod_1.z.string().optional(),
        documentNumber: zod_1.z.string().optional(),
        medications: zod_1.z.array(medicationItemSchema).optional().default([]),
    }),
});
exports.listPatientsSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().default(1),
        limit: zod_1.z.coerce.number().default(20),
        search: zod_1.z.string().optional(),
    }),
});
exports.patientIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
});
exports.createDeliveryManualSchema = zod_1.z.object({
    body: zod_1.z.object({
        patientId: zod_1.z.string().cuid().optional(),
        newPatient: zod_1.z
            .object({
            documentId: zod_1.z.string().min(1),
            documentType: zod_1.z.string().default('CC'),
            firstName: zod_1.z.string().min(1),
            lastName: zod_1.z.string().min(1),
            phone: zod_1.z.string().optional(),
            address: zod_1.z.string().min(1),
            city: zod_1.z.string().optional(),
            neighborhood: zod_1.z.string().optional(),
        })
            .optional(),
        priority: zod_1.z.nativeEnum(client_1.DeliveryPriority).default('MEDIUM'),
        observations: zod_1.z.string().optional(),
        scheduledDate: zod_1.z.string().optional(),
        scheduledTime: zod_1.z.string().optional(),
        documentNumber: zod_1.z.string().optional(),
        medications: zod_1.z.array(medicationItemSchema).min(1),
    }).refine((data) => data.patientId || data.newPatient, {
        message: 'patientId or newPatient is required',
    }),
});
