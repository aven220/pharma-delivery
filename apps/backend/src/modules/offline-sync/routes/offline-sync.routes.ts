import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createOfflineSyncService } from '../service/offline-sync.service';
import type { Server } from 'socket.io';

const syncSchema = z.object({
  body: z.object({
    deviceId: z.string().min(1),
    items: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['STATUS_UPDATE', 'EVIDENCE', 'INCIDENT', 'GPS', 'SIGNATURE']),
        payload: z.record(z.unknown()),
      })
    ),
  }),
});

export function createOfflineSyncRoutes(io?: Server) {
  const router = Router();
  const service = createOfflineSyncService(io);

  router.post('/push', validate(syncSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await service.processSync(req.user!.sub, req.body.deviceId, req.body.items);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  router.get('/pending', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const pending = await service.listPending(req.user!.sub);
      res.json({ success: true, data: pending });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
