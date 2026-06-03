import { z } from 'zod';
import { DeliveryStatus, DeliveryPriority } from '@prisma/client';

export const listDeliveriesSchema = z.object({
  query: z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(20),
    status: z.nativeEnum(DeliveryStatus).optional(),
    priority: z.nativeEnum(DeliveryPriority).optional(),
    courierId: z.string().optional(),
    driverId: z.string().optional(),
    assignedById: z.string().optional(),
    municipalityId: z.string().optional(),
    search: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }),
});

export const updateDeliveryStatusSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    status: z.nativeEnum(DeliveryStatus),
    lat: z.number().optional(),
    lng: z.number().optional(),
    accuracy: z.number().optional(),
    failureReason: z.string().optional(),
    observations: z.string().optional(),
  }),
});

export const getDeliverySchema = z.object({
  params: z.object({ id: z.string().cuid() }),
});
