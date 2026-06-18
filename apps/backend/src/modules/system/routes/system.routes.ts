import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { getDataHealth } from '../service/data-health.service';

const router = Router();

router.get(
  '/data-health',
  requirePermission('dashboard.read', 'audit.read'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await getDataHealth();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
