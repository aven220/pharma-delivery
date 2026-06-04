"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const dashboard_service_1 = require("../service/dashboard.service");
const router = (0, express_1.Router)();
router.get('/stats', (0, role_middleware_1.requirePermission)('dashboard.read', 'audit.read'), async (_req, res, next) => {
    try {
        const stats = await dashboard_service_1.dashboardService.getStats();
        res.json({ success: true, data: stats });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
