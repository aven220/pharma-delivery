"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../../../infra/database/prisma");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/', async (req, res, next) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where: { userId: req.user.sub },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.notification.count({ where: { userId: req.user.sub } }),
        ]);
        res.json({ success: true, data, meta: { total, page, limit } });
    }
    catch (error) {
        next(error);
    }
});
router.get('/unread-count', async (req, res, next) => {
    try {
        const count = await prisma_1.prisma.notification.count({
            where: { userId: req.user.sub, isRead: false },
        });
        res.json({ success: true, data: { count } });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/read-all', async (req, res, next) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { userId: req.user.sub, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
router.patch('/:id/read', async (req, res, next) => {
    try {
        const notification = await prisma_1.prisma.notification.update({
            where: { id: (0, auth_middleware_1.routeParam)(req.params.id), userId: req.user.sub },
            data: { isRead: true, readAt: new Date() },
        });
        res.json({ success: true, data: notification });
    }
    catch (error) {
        next(error);
    }
});
router.post('/push-token', async (req, res, next) => {
    try {
        await prisma_1.prisma.user.update({
            where: { id: req.user.sub },
            data: { pushToken: req.body.token },
        });
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
