import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../../infra/database/prisma';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.sub },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId: req.user!.sub } }),
    ]);

    res.json({ success: true, data, meta: { total, page, limit } });
  } catch (error) {
    next(error);
  }
});

router.get('/unread-count', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.sub, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: routeParam(req.params.id), userId: req.user!.sub },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

router.post('/push-token', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { pushToken: req.body.token },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
