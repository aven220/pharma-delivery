import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { prisma } from '../../../infra/database/prisma';

const gpsSchema = z.object({
  body: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    deliveryId: z.string().cuid().optional(),
    deviceId: z.string().optional(),
    altitude: z.number().optional(),
    speed: z.number().optional(),
    heading: z.number().optional(),
  }),
});

const router = Router();

router.post('/', validate(gpsSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const log = await prisma.gpsLog.create({
      data: {
        userId: req.user!.sub,
        ...req.body,
      },
    });

    await prisma.courier.updateMany({
      where: { userId: req.user!.sub },
      data: {
        currentLat: req.body.lat,
        currentLng: req.body.lng,
        lastGpsAt: new Date(),
      },
    });

    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

router.get('/courier/:courierId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const logs = await prisma.gpsLog.findMany({
      where: { userId: req.params.courierId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

export default router;
