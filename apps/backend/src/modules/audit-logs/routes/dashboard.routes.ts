import { Router, Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { dashboardService } from '../service/dashboard.service';

const router = Router();

router.get(
  '/stats',
  requirePermission('dashboard.read', 'audit.read'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await dashboardService.getStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
