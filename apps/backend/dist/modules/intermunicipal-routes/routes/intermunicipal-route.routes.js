"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIntermunicipalRouteRoutes = createIntermunicipalRouteRoutes;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const route_municipality_service_1 = require("../service/route-municipality.service");
const intermunicipal_route_service_1 = require("../service/intermunicipal-route.service");
const municipalitySchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(2),
        code: zod_1.z.string().optional(),
    }),
});
const routeCreateSchema = zod_1.z.object({
    body: zod_1.z.object({
        routeCode: zod_1.z.string().min(2),
        routeDate: zod_1.z.string(),
        driverId: zod_1.z.string().cuid(),
        municipalityId: zod_1.z.string().cuid(),
        observations: zod_1.z.string().optional(),
    }),
});
const addDeliveriesSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().cuid() }),
    body: zod_1.z.object({ deliveryIds: zod_1.z.array(zod_1.z.string().cuid()).min(1) }),
});
function createIntermunicipalRouteRoutes(io) {
    const router = (0, express_1.Router)();
    const service = (0, intermunicipal_route_service_1.createIntermunicipalRouteService)(io);
    router.get('/municipalities', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'route_municipalities.read'), async (req, res, next) => {
        try {
            const result = await route_municipality_service_1.routeMunicipalityService.list(Number(req.query.page) || 1, Number(req.query.limit) || 50, req.query.search, req.query.activeOnly === 'true');
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/municipalities', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(municipalitySchema), async (req, res, next) => {
        try {
            const data = await route_municipality_service_1.routeMunicipalityService.create(req.body);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.patch('/municipalities/:id', (0, role_middleware_1.requireRole)('ADMIN'), async (req, res, next) => {
        try {
            const data = await route_municipality_service_1.routeMunicipalityService.update((0, auth_middleware_1.routeParam)(req.params.id), req.body);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.patch('/municipalities/:id/active', (0, role_middleware_1.requireRole)('ADMIN'), async (req, res, next) => {
        try {
            const data = await route_municipality_service_1.routeMunicipalityService.setActive((0, auth_middleware_1.routeParam)(req.params.id), req.body.isActive !== false);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/dashboard', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'dashboard.read', 'deliveries.read'), async (_req, res, next) => {
        try {
            const data = await service.getDashboard();
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/drivers', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'intermunicipal_routes.write'), async (_req, res, next) => {
        try {
            const data = await service.listDrivers();
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/drivers/:driverId/active-routes', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.getDriverActiveRoutes((0, auth_middleware_1.routeParam)(req.params.driverId));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/my', (0, role_middleware_1.requirePermission)('courier.app'), async (req, res, next) => {
        try {
            const data = await service.listMyRoutes(req.user.sub, req.query.status);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'deliveries.read', 'calls.read'), async (req, res, next) => {
        try {
            const result = await service.list({
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 20,
                status: req.query.status,
                municipalityId: req.query.municipalityId,
                driverId: req.query.driverId,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
            });
            res.json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/:id', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read', 'courier.app', 'deliveries.read', 'calls.read'), async (req, res, next) => {
        try {
            const data = await service.getById((0, auth_middleware_1.routeParam)(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), (0, validate_middleware_1.validate)(routeCreateSchema), async (req, res, next) => {
        try {
            const data = await service.create(req.body, req.user.sub);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.patch('/:id', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.update((0, auth_middleware_1.routeParam)(req.params.id), req.body, req.user.sub);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/deliveries', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write', 'intermunicipal_routes.add_deliveries', 'calls.write'), (0, validate_middleware_1.validate)(addDeliveriesSchema), async (req, res, next) => {
        try {
            const data = await service.addDeliveries((0, auth_middleware_1.routeParam)(req.params.id), req.body.deliveryIds, req.user.sub);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.delete('/:id/deliveries/:deliveryId', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write', 'intermunicipal_routes.add_deliveries', 'calls.write'), async (req, res, next) => {
        try {
            const data = await service.removeDelivery((0, auth_middleware_1.routeParam)(req.params.id), (0, auth_middleware_1.routeParam)(req.params.deliveryId), req.user.sub);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/dispatch', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.dispatch((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/start', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write', 'courier.app'), async (req, res, next) => {
        try {
            const data = await service.startRoute((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/close', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write', 'courier.app'), async (req, res, next) => {
        try {
            const user = req.user;
            const canManageRoutes = user.role === 'ADMIN' || user.permissions.includes('intermunicipal_routes.write');
            const data = await service.close((0, auth_middleware_1.routeParam)(req.params.id), user.sub, req.body.notes, {
                requireAssignedDriver: !canManageRoutes,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/cancel', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.cancel((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, req.body.notes);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/transfer-driver', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.transferDriver((0, auth_middleware_1.routeParam)(req.params.id), req.body.newDriverId, req.user.sub, req.body.notes);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/:id/split', (0, role_middleware_1.requirePermission)('intermunicipal_routes.write'), async (req, res, next) => {
        try {
            const data = await service.splitRoute((0, auth_middleware_1.routeParam)(req.params.id), req.body, req.user.sub);
            res.status(201).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/:id/history', (0, role_middleware_1.requirePermission)('intermunicipal_routes.read'), async (req, res, next) => {
        try {
            const data = await service.getHistory((0, auth_middleware_1.routeParam)(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
