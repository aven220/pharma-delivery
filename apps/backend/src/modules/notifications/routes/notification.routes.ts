import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../../infra/database/prisma';
import { AuthRequest } from '../../../middlewares/auth.middleware';

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

router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id, userId: req.user!.sub },
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
