"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../../infra/database/prisma");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.get('/', (0, role_middleware_1.requirePermission)('users.read', 'roles.read'), async (_req, res, next) => {
    try {
        const roles = await prisma_1.prisma.role.findMany({
            where: { deletedAt: null, name: { not: 'COURIER' } },
            include: {
                permissions: { include: { permission: true } },
                _count: { select: { users: true } },
            },
            orderBy: { name: 'asc' },
        });
        const data = roles.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            userCount: role._count.users,
            permissions: role.permissions.map((rp) => ({
                code: rp.permission.code,
                name: rp.permission.name,
                module: rp.permission.module,
            })),
        }));
        res.json({ success: true, data });
    }
    catch (error) {
        next(error);
    }
});
router.get('/permissions', (0, role_middleware_1.requirePermission)('users.read', 'roles.read'), async (_req, res, next) => {
    try {
        const permissions = await prisma_1.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
        res.json({ success: true, data: permissions });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
