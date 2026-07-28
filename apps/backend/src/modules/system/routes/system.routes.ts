import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission, requireRole } from '../../../middlewares/role.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { getDataHealth } from '../service/data-health.service';
import { queueResetService } from '../service/queue-reset.service';

const resetSchema = z.object({
  body: z.object({
    confirmationPhrase: z.string().min(1),
    password: z.string().min(1),
  }),
});

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

router.get(
  '/queue-reset/preview',
  requireRole('ADMIN'),
  requirePermission('system.reset_queue'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await queueResetService.preview();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/queue-reset',
  requireRole('ADMIN'),
  requirePermission('system.reset_queue'),
  validate(resetSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await queueResetService.execute(req.user!.sub, req.body, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
