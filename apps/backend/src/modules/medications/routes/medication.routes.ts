import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { MedicationStatus } from '@prisma/client';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { medicationService } from '../service/medication.service';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const createSchema = z.object({
  body: z.object({
    cum: z.string().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    laboratory: z.string().optional(),
    presentation: z.string().optional(),
    concentration: z.string().optional(),
    status: z.nativeEnum(MedicationStatus).optional(),
  }),
});

const updateSchema = z.object({
  body: z.object({
    cum: z.string().optional(),
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    laboratory: z.string().optional(),
    presentation: z.string().optional(),
    concentration: z.string().optional(),
    status: z.nativeEnum(MedicationStatus).optional(),
  }),
});

const router = Router();

router.get('/', requirePermission('medications.read', 'medications.write', 'audit.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await medicationService.list(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 20,
      req.query.search as string,
      req.query.status as MedicationStatus
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/search', requirePermission('medications.read', 'medications.write', 'patients.write', 'deliveries.write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await medicationService.search(req.query.q as string, Number(req.query.limit) || 10);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/by-cum/:cum', requirePermission('medications.read', 'medications.write', 'patients.write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await medicationService.getByCum(routeParam(req.params.cum));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('medications.write'), validate(createSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await medicationService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requirePermission('medications.write'), validate(updateSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await medicationService.update(routeParam(req.params.id), req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/import', requirePermission('medications.import', 'medications.write'), upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'File required' });
      return;
    }
    const data = await medicationService.bulkImport(req.file.buffer);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
