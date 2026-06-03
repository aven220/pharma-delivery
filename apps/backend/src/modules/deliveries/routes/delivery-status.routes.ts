import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DeactivationReason, PendingSubreason } from '@prisma/client';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import {
  deliveryStatusService,
  DEACTIVATION_REASONS,
  PENDING_SUBREASONS,
} from '../service/delivery-status.service';

const actionSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    action: z.enum(['CONFIRM', 'PENDING', 'DEACTIVATE', 'REACTIVATE', 'RESCHEDULE']),
    observations: z.string().optional(),
    deactivationReason: z.nativeEnum(DeactivationReason).optional(),
    pendingSubreason: z.nativeEnum(PendingSubreason).optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
  }),
});

const router = Router();

router.get('/meta/reasons', (_req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: { deactivationReasons: DEACTIVATION_REASONS, pendingSubreasons: PENDING_SUBREASONS },
  });
});

router.get('/:id/status-history', requirePermission('deliveries.read', 'calls.read', 'audit.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await deliveryStatusService.getHistory(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/action', requirePermission('calls.write', 'deliveries.write'), validate(actionSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { action, observations, deactivationReason, pendingSubreason, scheduledDate, scheduledTime } = req.body;
    let result;

    switch (action) {
      case 'CONFIRM':
        result = await deliveryStatusService.confirmForDelivery(req.params.id, req.user!.sub, observations);
        break;
      case 'PENDING':
        if (!pendingSubreason) {
          res.status(400).json({ success: false, message: 'Submotivo requerido' });
          return;
        }
        result = await deliveryStatusService.setPending(req.params.id, req.user!.sub, pendingSubreason, observations);
        break;
      case 'DEACTIVATE':
        if (!deactivationReason) {
          res.status(400).json({ success: false, message: 'Motivo de baja requerido' });
          return;
        }
        result = await deliveryStatusService.deactivate(req.params.id, req.user!.sub, deactivationReason, observations);
        break;
      case 'REACTIVATE':
        result = await deliveryStatusService.reactivate(req.params.id, req.user!.sub, observations);
        break;
      case 'RESCHEDULE':
        result = await deliveryStatusService.transition(req.params.id, req.user!.sub, {
          toStatus: 'RESCHEDULED',
          action: 'RESCHEDULE',
          observations,
          scheduledDate,
          scheduledTime,
        });
        break;
      default:
        res.status(400).json({ success: false, message: 'Acción inválida' });
        return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
