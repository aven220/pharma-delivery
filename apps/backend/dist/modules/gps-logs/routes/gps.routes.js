"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const prisma_1 = require("../../../infra/database/prisma");
const gpsSchema = zod_1.z.object({
    body: zod_1.z.object({
        lat: zod_1.z.number(),
        lng: zod_1.z.number(),
        accuracy: zod_1.z.number().optional(),
        deliveryId: zod_1.z.string().cuid().optional(),
        deviceId: zod_1.z.string().optional(),
        altitude: zod_1.z.number().optional(),
        speed: zod_1.z.number().optional(),
        heading: zod_1.z.number().optional(),
    }),
});
const router = (0, express_1.Router)();
router.post('/', (0, validate_middleware_1.validate)(gpsSchema), async (req, res, next) => {
    try {
        const log = await prisma_1.prisma.gpsLog.create({
            data: {
                userId: req.user.sub,
                ...req.body,
            },
        });
        await prisma_1.prisma.courier.updateMany({
            where: { userId: req.user.sub },
            data: {
                currentLat: req.body.lat,
                currentLng: req.body.lng,
                lastGpsAt: new Date(),
            },
        });
        res.status(201).json({ success: true, data: log });
    }
    catch (error) {
        next(error);
    }
});
router.get('/courier/:courierId', async (req, res, next) => {
    try {
        const logs = await prisma_1.prisma.gpsLog.findMany({
            where: { userId: (0, auth_middleware_1.routeParam)(req.params.courierId) },
            orderBy: { recordedAt: 'desc' },
            take: 100,
        });
        res.json({ success: true, data: logs });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
