import { z } from 'zod';
import { DeliveryPriority } from '@prisma/client';

const medicationItemSchema = z.object({
  medicationCode: z.string().min(1),
  medicationName: z.string().min(1),
  quantity: z.coerce.number().int().min(1).default(1),
  lotNumber: z.string().optional(),
  observations: z.string().optional(),
});

export const createPatientManualSchema = z.object({
  body: z.object({
    documentId: z.string().min(1),
    documentType: z.string().default('CC'),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    address: z.string().min(1),
    city: z.string().optional(),
    neighborhood: z.string().optional(),
    observations: z.string().optional(),
    priority: z.nativeEnum(DeliveryPriority).default('MEDIUM'),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    documentNumber: z.string().optional(),
    medications: z.array(medicationItemSchema).optional().default([]),
  }),
});

export const listPatientsSchema = z.object({
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    search: z.string().optional(),
  }),
});

export const patientIdSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
});

export const createDeliveryManualSchema = z.object({
  body: z.object({
    patientId: z.string().cuid().optional(),
    newPatient: z
      .object({
        documentId: z.string().min(1),
        documentType: z.string().default('CC'),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        phone: z.string().optional(),
        address: z.string().min(1),
        city: z.string().optional(),
        neighborhood: z.string().optional(),
      })
      .optional(),
    priority: z.nativeEnum(DeliveryPriority).default('MEDIUM'),
    observations: z.string().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    documentNumber: z.string().optional(),
    medications: z.array(medicationItemSchema).min(1),
  }).refine((data) => data.patientId || data.newPatient, {
    message: 'patientId or newPatient is required',
  }),
});
