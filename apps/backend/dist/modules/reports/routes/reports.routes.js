"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const reports_service_1 = require("../service/reports.service");
const router = (0, express_1.Router)();
router.get('/types', (0, role_middleware_1.requirePermission)('reports.export', 'dashboard.read'), (_req, res) => {
    res.json({ success: true, data: reports_service_1.REPORT_TYPES });
});
router.get('/:type', (0, role_middleware_1.requirePermission)('reports.export', 'dashboard.read'), async (req, res, next) => {
    try {
        const type = req.params.type;
        if (!reports_service_1.REPORT_TYPES.includes(type)) {
            res.status(400).json({ success: false, message: 'Tipo de reporte no válido' });
            return;
        }
        const format = ['csv', 'html', 'pdf'].includes(req.query.format)
            ? req.query.format
            : 'xlsx';
        const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom) : undefined;
        const dateTo = req.query.dateTo ? new Date(req.query.dateTo) : undefined;
        const result = await reports_service_1.reportsService.generate(type, format, {
            dateFrom,
            dateTo,
            status: req.query.status,
            operatorId: req.query.operatorId,
            courierId: req.query.courierId,
            municipalityId: req.query.municipalityId,
            routeId: req.query.routeId,
        });
        res.setHeader('Content-Type', result.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        res.send(result.buffer);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
