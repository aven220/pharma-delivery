import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { createAssignmentService } from '../service/assignment.service';
import { courierPanelService } from '../../couriers/service/courier-panel.service';
import type { Server } from 'socket.io';

const createSchema = z.object({
  body: z.object({
    deliveryIds: z.array(z.string().cuid()).min(1),
    courierId: z.string().cuid(),
    notes: z.string().optional(),
  }),
});

const reassignSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    courierId: z.string().cuid(),
    notes: z.string().optional(),
  }),
});

const withdrawSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({ notes: z.string().optional() }),
});

export function createAssignmentRoutes(io?: Server) {
  const router = Router();
  const service = createAssignmentService(io);

  router.post('/', requirePermission('assignments.write'), validate(createSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.createMultiple(
        req.body.deliveryIds,
        req.body.courierId,
        req.user!.sub,
        req.body.notes
      );
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/reassign', requirePermission('assignments.write'), validate(reassignSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.reassign(req.params.id, req.body.courierId, req.user!.sub, req.body.notes);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/withdraw', requirePermission('assignments.write'), validate(withdrawSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.withdraw(req.params.id, req.user!.sub, req.body.notes);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.get('/couriers', requirePermission('assignments.write', 'couriers.read', 'dashboard.read', 'deliveries.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await courierPanelService.listCouriersForAssignment({
        search: req.query.search as string,
        zone: req.query.zone as string,
      });
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', requirePermission('assignments.write', 'deliveries.read', 'audit.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.list({
        courierId: req.query.courierId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
