"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssignmentRoutes = createAssignmentRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const assignment_service_1 = require("../service/assignment.service");
const courier_panel_service_1 = require("../../couriers/service/courier-panel.service");
const createSchema = zod_1.z.object({
    body: zod_1.z.object({
        deliveryIds: zod_1.z.array(zod_1.z.string().cuid()).min(1),
        courierId: zod_1.z.string().cuid(),
        notes: zod_1.z.string().optional(),
    }),
});
const reassignSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        courierId: zod_1.z.string().cuid(),
        notes: zod_1.z.string().optional(),
    }),
});
const withdrawSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({ notes: zod_1.z.string().optional() }),
});
function createAssignmentRoutes(io) {
    const router = (0, express_1.Router)();
    const service = (0, assignment_service_1.createAssignmentService)(io);
    router.post('/', (0, role_middleware_1.requirePermission)('assignments.write'), (0, validate_middleware_1.validate)(createSchema), async (req, res, next) => {
        try {
            const result = await service.createMultiple(req.body.deliveryIds, req.body.courierId, req.user.sub, req.body.notes);
            res.status(201).json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/reassign', (0, role_middleware_1.requirePermission)('assignments.write'), (0, validate_middleware_1.validate)(reassignSchema), async (req, res, next) => {
        try {
            const result = await service.reassign((0, auth_middleware_1.routeParam)(req.params.id), req.body.courierId, req.user.sub, req.body.notes);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/withdraw', (0, role_middleware_1.requirePermission)('assignments.write'), (0, validate_middleware_1.validate)(withdrawSchema), async (req, res, next) => {
        try {
            const result = await service.withdraw((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, req.body.notes);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/couriers', (0, role_middleware_1.requirePermission)('assignments.write', 'couriers.read', 'dashboard.read', 'deliveries.read'), async (req, res, next) => {
        try {
            const data = await courier_panel_service_1.courierPanelService.listCouriersForAssignment({
                search: req.query.search,
                zone: req.query.zone,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/', (0, role_middleware_1.requirePermission)('assignments.write', 'deliveries.read', 'audit.read'), async (req, res, next) => {
        try {
            const result = await service.list({
                courierId: req.query.courierId,
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
