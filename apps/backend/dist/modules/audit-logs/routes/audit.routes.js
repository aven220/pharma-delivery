"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../../infra/database/prisma");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get('/', (0, role_middleware_1.requirePermission)('audit.read', 'dashboard.read'), async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma_1.prisma.auditLog.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true, firstName: true, lastName: true } },
                },
            }),
            prisma_1.prisma.auditLog.count(),
        ]);
        res.json({ success: true, data, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
