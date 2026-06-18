import { Router, Response, NextFunction } from 'express';
import { DeliveryStatus } from '@prisma/client';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { pendingPrepService } from '../service/pending-prep.service';

const router = Router();

router.get(
  '/summary',
  requirePermission('deliveries.read', 'deliveries.write'),
  async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await pendingPrepService.summary();
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/',
  requirePermission('deliveries.read', 'deliveries.write'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as DeliveryStatus | undefined;
      const search = req.query.search as string | undefined;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await pendingPrepService.list({ status, search, page, limit });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/pack',
  requirePermission('deliveries.write'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { observations, items, patientUpdates } = req.body as {
        observations?: string;
        items?: Array<{ itemId: string; lotNumber?: string }>;
        patientUpdates?: Record<string, string>;
      };
      const data = await pendingPrepService.pack(routeParam(req.params.id), req.user!.sub, {
        observations,
        items,
        patientUpdates,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/reject',
  requirePermission('deliveries.write'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { observations } = req.body as { observations?: string };
      const data = await pendingPrepService.reject(
        routeParam(req.params.id),
        req.user!.sub,
        observations || ''
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/reopen',
  requirePermission('deliveries.write'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { observations } = req.body as { observations?: string };
      const data = await pendingPrepService.reopen(
        routeParam(req.params.id),
        req.user!.sub,
        observations
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
