import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../../infra/database/prisma';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';

const router = Router();

router.get(
  '/',
  requirePermission('audit.read', 'dashboard.read'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
        prisma.auditLog.findMany({
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { email: true, firstName: true, lastName: true } },
          },
        }),
        prisma.auditLog.count(),
      ]);

      res.json({ success: true, data, meta: { total, page, limit } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
