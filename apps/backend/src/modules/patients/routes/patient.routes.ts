import { Router, Response, NextFunction } from 'express';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { patientService } from '../service/patient.service';
import {
  createPatientManualSchema,
  listPatientsSchema,
  patientIdSchema,
  createDeliveryManualSchema,
} from '../validators/patient.validators';

const router = Router();

router.get(
  '/',
  requirePermission('patients.read', 'audit.read'),
  validate(listPatientsSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await patientService.list(
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
        req.query.search as string
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id',
  requirePermission('patients.read', 'audit.read'),
  validate(patientIdSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await patientService.getById(routeParam(req.params.id));
      res.json({ success: true, data: patient });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/manual',
  requirePermission('patients.write'),
  validate(createPatientManualSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await patientService.createManualWithDelivery(req.body, { rejectDuplicate: true });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/deliveries/manual',
  requirePermission('deliveries.write'),
  validate(createDeliveryManualSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await patientService.createDeliveryForPatient(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/:id/history',
  requirePermission('patients.read', 'audit.read', 'calls.read'),
  validate(patientIdSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const history = await patientService.getFullHistory(routeParam(req.params.id));
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
