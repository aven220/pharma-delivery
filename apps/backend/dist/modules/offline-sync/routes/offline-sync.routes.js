"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOfflineSyncRoutes = createOfflineSyncRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const offline_sync_service_1 = require("../service/offline-sync.service");
const syncSchema = zod_1.z.object({
    body: zod_1.z.object({
        deviceId: zod_1.z.string().min(1),
        items: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            type: zod_1.z.enum(['STATUS_UPDATE', 'EVIDENCE', 'INCIDENT', 'GPS', 'SIGNATURE']),
            payload: zod_1.z.record(zod_1.z.unknown()),
        })),
    }),
});
function createOfflineSyncRoutes(io) {
    const router = (0, express_1.Router)();
    const service = (0, offline_sync_service_1.createOfflineSyncService)(io);
    router.post('/push', (0, validate_middleware_1.validate)(syncSchema), async (req, res, next) => {
        try {
            const result = await service.processSync(req.user.sub, req.body.deviceId, req.body.items);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/pending', async (req, res, next) => {
        try {
            const pending = await service.listPending(req.user.sub);
            res.json({ success: true, data: pending });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
