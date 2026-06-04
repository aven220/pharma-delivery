"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const call_service_1 = require("../service/call.service");
const call_assignment_service_1 = require("../service/call-assignment.service");
const registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        deliveryId: zod_1.z.string().cuid(),
        phoneUsed: zod_1.z.string().min(1),
        result: zod_1.z.nativeEnum(client_1.CallResult),
        durationSec: zod_1.z.number().optional(),
        observations: zod_1.z.string().optional(),
        newPhone: zod_1.z.string().optional(),
        newAddress: zod_1.z.string().optional(),
        rescheduleDate: zod_1.z.string().optional(),
        rescheduleTime: zod_1.z.string().optional(),
        action: zod_1.z.enum(['CONFIRM', 'PENDING', 'DEACTIVATE', 'REACTIVATE', 'RESCHEDULE']).optional(),
        deactivationReason: zod_1.z.nativeEnum(client_1.DeactivationReason).optional(),
        pendingSubreason: zod_1.z.nativeEnum(client_1.PendingSubreason).optional(),
    }),
});
const assignSchema = zod_1.z.object({
    body: zod_1.z.object({
        deliveryIds: zod_1.z.array(zod_1.z.string().cuid()).min(1),
        operatorUserId: zod_1.z.string().cuid(),
    }),
});
const updateAssignmentSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.CallQueueStatus).optional(),
        managementResult: zod_1.z.nativeEnum(client_1.CallManagementResult).optional(),
        observations: zod_1.z.string().optional(),
        callDate: zod_1.z.string().optional(),
        callTime: zod_1.z.string().optional(),
        durationSec: zod_1.z.number().optional(),
        phoneUsed: zod_1.z.string().optional(),
        rescheduleDate: zod_1.z.string().optional(),
        rescheduleTime: zod_1.z.string().optional(),
        patientUpdates: zod_1.z
            .object({
            address: zod_1.z.string().optional(),
            neighborhood: zod_1.z.string().optional(),
            city: zod_1.z.string().optional(),
            addressDetail: zod_1.z.string().optional(),
            phone: zod_1.z.string().optional(),
            phoneAlt: zod_1.z.string().optional(),
            phoneFamily: zod_1.z.string().optional(),
            phoneAlternative: zod_1.z.string().optional(),
        })
            .optional(),
    }),
});
const router = (0, express_1.Router)();
router.get('/pending', (0, role_middleware_1.requirePermission)('calls.assign'), async (req, res, next) => {
    try {
        const result = await call_assignment_service_1.callAssignmentService.listPendingCalls(Number(req.query.page) || 1, Number(req.query.limit) || 50, req.query.search);
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.get('/my', (0, role_middleware_1.requirePermission)('calls.write'), async (req, res, next) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const result = await call_assignment_service_1.callAssignmentService.listMyCalls(req.user.sub, {
            status: req.query.status,
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        }, { allOperators: isAdmin });
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.post('/assign', (0, role_middleware_1.requirePermission)('calls.assign', 'assignments.write'), (0, validate_middleware_1.validate)(assignSchema), async (req, res, next) => {
    try {
        const data = await call_assignment_service_1.callAssignmentService.assignToOperator(req.body.deliveryIds, req.body.operatorUserId, req.user.sub);
        res.status(201).json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/my/:id', (0, role_middleware_1.requirePermission)('calls.write'), (0, validate_middleware_1.validate)(updateAssignmentSchema), async (req, res, next) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const data = await call_assignment_service_1.callAssignmentService.updateAssignment((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, req.body, isAdmin ? { bypassOperatorCheck: true, actingUserId: req.user.sub } : undefined);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/operators', (0, role_middleware_1.requirePermission)('calls.assign'), async (_req, res, next) => {
    try {
        const data = await call_assignment_service_1.callAssignmentService.listOperators();
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/management-stats', (0, role_middleware_1.requirePermission)('calls.read', 'dashboard.read'), async (req, res, next) => {
    try {
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
        const data = await call_assignment_service_1.callAssignmentService.getManagementStats(dateFrom, dateTo);
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.post('/', (0, role_middleware_1.requirePermission)('calls.write'), (0, validate_middleware_1.validate)(registerSchema), async (req, res, next) => {
    try {
        const call = await call_service_1.callService.registerCall({
            ...req.body,
            operatorId: req.user.sub,
        });
        res.status(201).json({ success: true, data: call });
    }
    catch (error) {
        next(error);
    }
});
router.get('/', (0, role_middleware_1.requirePermission)('calls.read', 'calls.write', 'audit.read'), async (req, res, next) => {
    try {
        const result = await call_service_1.callService.list({
            deliveryId: req.query.deliveryId,
            page: Number(req.query.page) || 1,
        });
        res.json({ success: true, ...result });
    }
    catch (error) {
        next(error);
    }
});
router.get('/stats', (0, role_middleware_1.requirePermission)('calls.read', 'calls.write', 'dashboard.read'), async (_req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const stats = await call_service_1.callService.getEffectivenessStats(today);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
