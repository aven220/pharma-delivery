"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeliverySchema = exports.updateDeliveryStatusSchema = exports.listDeliveriesSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.listDeliveriesSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().default(1),
        limit: zod_1.z.coerce.number().default(20),
        status: zod_1.z.nativeEnum(client_1.DeliveryStatus).optional(),
        priority: zod_1.z.nativeEnum(client_1.DeliveryPriority).optional(),
        courierId: zod_1.z.string().optional(),
        driverId: zod_1.z.string().optional(),
        assignedById: zod_1.z.string().optional(),
        municipalityId: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
        dateFrom: zod_1.z.string().optional(),
        dateTo: zod_1.z.string().optional(),
    }),
});
exports.updateDeliveryStatusSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.DeliveryStatus),
        lat: zod_1.z.number().optional(),
        lng: zod_1.z.number().optional(),
        accuracy: zod_1.z.number().optional(),
        failureReason: zod_1.z.string().optional(),
        observations: zod_1.z.string().optional(),
    }),
});
exports.getDeliverySchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
});
