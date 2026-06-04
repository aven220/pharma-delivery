"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const delivery_status_service_1 = require("../service/delivery-status.service");
const actionSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        action: zod_1.z.enum(['CONFIRM', 'PENDING', 'DEACTIVATE', 'REACTIVATE', 'RESCHEDULE']),
        observations: zod_1.z.string().optional(),
        deactivationReason: zod_1.z.nativeEnum(client_1.DeactivationReason).optional(),
        pendingSubreason: zod_1.z.nativeEnum(client_1.PendingSubreason).optional(),
        scheduledDate: zod_1.z.string().optional(),
        scheduledTime: zod_1.z.string().optional(),
    }),
});
const router = (0, express_1.Router)();
router.get('/meta/reasons', (_req, res) => {
    res.json({
        success: true,
        data: { deactivationReasons: delivery_status_service_1.DEACTIVATION_REASONS, pendingSubreasons: delivery_status_service_1.PENDING_SUBREASONS },
    });
});
router.get('/:id/status-history', (0, role_middleware_1.requirePermission)('deliveries.read', 'calls.read', 'audit.read'), async (req, res, next) => {
    try {
        const data = await delivery_status_service_1.deliveryStatusService.getHistory((0, auth_middleware_1.routeParam)(req.params.id));
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/:id/action', (0, role_middleware_1.requirePermission)('calls.write', 'deliveries.write'), (0, validate_middleware_1.validate)(actionSchema), async (req, res, next) => {
    try {
        const { action, observations, deactivationReason, pendingSubreason, scheduledDate, scheduledTime } = req.body;
        let result;
        switch (action) {
            case 'CONFIRM':
                result = await delivery_status_service_1.deliveryStatusService.confirmForDelivery((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, observations);
                break;
            case 'PENDING':
                if (!pendingSubreason) {
                    res.status(400).json({ success: false, message: 'Submotivo requerido' });
                    return;
                }
                result = await delivery_status_service_1.deliveryStatusService.setPending((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, pendingSubreason, observations);
                break;
            case 'DEACTIVATE':
                if (!deactivationReason) {
                    res.status(400).json({ success: false, message: 'Motivo de baja requerido' });
                    return;
                }
                result = await delivery_status_service_1.deliveryStatusService.deactivate((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, deactivationReason, observations);
                break;
            case 'REACTIVATE':
                result = await delivery_status_service_1.deliveryStatusService.reactivate((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, observations);
                break;
            case 'RESCHEDULE':
                result = await delivery_status_service_1.deliveryStatusService.transition((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, {
                    toStatus: 'RESCHEDULED',
                    action: 'RESCHEDULE',
                    observations,
                    scheduledDate,
                    scheduledTime,
                });
                break;
            default:
                res.status(400).json({ success: false, message: 'Acción inválida' });
                return;
        }
        res.json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
