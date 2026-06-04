import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { IncidentType, EvidenceType } from '@prisma/client';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { createIncidentService, evidenceService } from '../service/incident.service';
import { env } from '../../../config/env';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { Server } from 'socket.io';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.MAX_FILE_SIZE } });

const incidentSchema = z.object({
  body: z.object({
    deliveryId: z.string().cuid(),
    type: z.nativeEnum(IncidentType),
    description: z.string().min(1),
    lat: z.number().optional(),
    lng: z.number().optional(),
    accuracy: z.number().optional(),
  }),
});

export function createIncidentRoutes(io?: Server) {
  const router = Router();
  const incidentService = createIncidentService(io);

  router.post('/', validate(incidentSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const incident = await incidentService.create({
        ...req.body,
        reportedById: req.user!.sub,
      });
      res.status(201).json({ success: true, data: incident });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await incidentService.list({
        deliveryId: req.query.deliveryId as string,
        page: Number(req.query.page) || 1,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export function createEvidenceRoutes() {
  const router = Router();

  router.post('/', upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'File required' });
        return;
      }
      const evidence = await evidenceService.upload({
        deliveryId: req.body.deliveryId,
        uploadedById: req.user!.sub,
        type: (req.body.type as EvidenceType) || 'PHOTO',
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        incidentId: req.body.incidentId,
        lat: req.body.lat ? Number(req.body.lat) : undefined,
        lng: req.body.lng ? Number(req.body.lng) : undefined,
      });
      res.status(201).json({ success: true, data: evidence });
    } catch (error) {
      next(error);
    }
  });

  router.get('/delivery/:deliveryId', requirePermission('deliveries.read', 'audit.read', 'dashboard.read', 'courier.app'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const evidence = await evidenceService.listByDelivery(routeParam(req.params.deliveryId));
      res.json({ success: true, data: evidence });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/file', requirePermission('deliveries.read', 'audit.read', 'dashboard.read', 'courier.app'), async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { evidence, fullPath } = await evidenceService.getFile(routeParam(req.params.id));
      res.setHeader('Content-Type', evidence.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${evidence.fileName}"`);
      res.sendFile(path.resolve(fullPath));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
