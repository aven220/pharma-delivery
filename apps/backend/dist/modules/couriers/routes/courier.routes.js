"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCourierRoutes = createCourierRoutes;
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const courier_panel_service_1 = require("../service/courier-panel.service");
const courier_route_service_1 = require("../service/courier-route.service");
function createCourierRoutes(io) {
    const router = (0, express_1.Router)();
    router.get('/routes', (0, role_middleware_1.requirePermission)('couriers.read', 'assignments.write', 'dashboard.read'), async (req, res, next) => {
        try {
            const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
            const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
            const data = await courier_route_service_1.courierRouteService.listRoutes({
                courierId: req.query.courierId,
                dateFrom,
                dateTo,
                status: req.query.status,
            });
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/routes/today/:courierId', (0, role_middleware_1.requirePermission)('couriers.read', 'assignments.write'), async (req, res, next) => {
        try {
            const data = await courier_route_service_1.courierRouteService.getTodayRoute((0, auth_middleware_1.routeParam)(req.params.courierId));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/routes/:id/carry-over', (0, role_middleware_1.requirePermission)('assignments.write', 'couriers.read'), async (req, res, next) => {
        try {
            const { targetDate } = req.body;
            if (!targetDate) {
                res.status(400).json({ success: false, message: 'targetDate es requerido' });
                return;
            }
            const data = await courier_route_service_1.courierRouteService.carryOverPending((0, auth_middleware_1.routeParam)(req.params.id), targetDate, req.user.sub);
            io?.to(`user:${data.previousRoute.courierId}`).emit('route.carry_over', {
                routeId: data.nextRoute.id,
                movedCount: data.movedCount,
                targetDate,
            });
            io?.to('admin').emit('route.carry_over', data);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.post('/routes/:id/close', (0, role_middleware_1.requirePermission)('assignments.write', 'couriers.read'), async (req, res, next) => {
        try {
            const { notes } = req.body;
            const data = await courier_route_service_1.courierRouteService.closeRoute((0, auth_middleware_1.routeParam)(req.params.id), req.user.sub, notes);
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/', (0, role_middleware_1.requirePermission)('couriers.read', 'assignments.write', 'dashboard.read'), async (req, res, next) => {
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
    router.get('/panel', (0, role_middleware_1.requirePermission)('couriers.read', 'dashboard.read'), async (_req, res, next) => {
        try {
            const data = await courier_panel_service_1.courierPanelService.getPanelOverview();
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    router.get('/:id', (0, role_middleware_1.requirePermission)('couriers.read', 'dashboard.read'), async (req, res, next) => {
        try {
            const data = await courier_panel_service_1.courierPanelService.getCourierDetail((0, auth_middleware_1.routeParam)(req.params.id));
            res.json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    });
    return router;
}
exports.default = createCourierRoutes();
