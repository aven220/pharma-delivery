import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CallManagementResult, CallQueueStatus, CallResult, DeactivationReason, PendingSubreason } from '@prisma/client';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { callService } from '../service/call.service';
import { callAssignmentService } from '../service/call-assignment.service';

const registerSchema = z.object({
  body: z.object({
    deliveryId: z.string().cuid(),
    phoneUsed: z.string().min(1),
    result: z.nativeEnum(CallResult),
    durationSec: z.number().optional(),
    observations: z.string().optional(),
    newPhone: z.string().optional(),
    newAddress: z.string().optional(),
    rescheduleDate: z.string().optional(),
    rescheduleTime: z.string().optional(),
    action: z.enum(['CONFIRM', 'PENDING', 'DEACTIVATE', 'REACTIVATE', 'RESCHEDULE']).optional(),
    deactivationReason: z.nativeEnum(DeactivationReason).optional(),
    pendingSubreason: z.nativeEnum(PendingSubreason).optional(),
  }),
});

const assignSchema = z.object({
  body: z.object({
    deliveryIds: z.array(z.string().cuid()).min(1),
    operatorUserId: z.string().cuid(),
  }),
});

const updateAssignmentSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({
    status: z.nativeEnum(CallQueueStatus).optional(),
    managementResult: z.nativeEnum(CallManagementResult).optional(),
    observations: z.string().optional(),
    callDate: z.string().optional(),
    callTime: z.string().optional(),
    durationSec: z.number().optional(),
    phoneUsed: z.string().optional(),
    rescheduleDate: z.string().optional(),
    rescheduleTime: z.string().optional(),
    patientUpdates: z
      .object({
        address: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        addressDetail: z.string().optional(),
        phone: z.string().optional(),
        phoneAlt: z.string().optional(),
        phoneFamily: z.string().optional(),
        phoneAlternative: z.string().optional(),
      })
      .optional(),
  }),
});

const router = Router();

router.get('/pending', requirePermission('calls.assign'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await callAssignmentService.listPendingCalls(
      Number(req.query.page) || 1,
      Number(req.query.limit) || 50,
      req.query.search as string | undefined
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/my', requirePermission('calls.write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await callAssignmentService.listMyCalls(
      req.user!.sub,
      {
        status: req.query.status as CallQueueStatus,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      },
      { allOperators: isAdmin }
    );
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.post('/assign', requirePermission('calls.assign', 'assignments.write'), validate(assignSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await callAssignmentService.assignToOperator(
      req.body.deliveryIds,
      req.body.operatorUserId,
      req.user!.sub
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.patch('/my/:id', requirePermission('calls.write'), validate(updateAssignmentSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const data = await callAssignmentService.updateAssignment(
      req.params.id,
      req.user!.sub,
      req.body,
      isAdmin ? { bypassOperatorCheck: true, actingUserId: req.user!.sub } : undefined
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/operators', requirePermission('calls.assign'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await callAssignmentService.listOperators();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/management-stats', requirePermission('calls.read', 'dashboard.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const data = await callAssignmentService.getManagementStats(dateFrom, dateTo);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/', requirePermission('calls.write'), validate(registerSchema), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const call = await callService.registerCall({
      ...req.body,
      operatorId: req.user!.sub,
    });
    res.status(201).json({ success: true, data: call });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('calls.read', 'calls.write', 'audit.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await callService.list({
      deliveryId: req.query.deliveryId as string,
      page: Number(req.query.page) || 1,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', requirePermission('calls.read', 'calls.write', 'dashboard.read'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const stats = await callService.getEffectivenessStats(today);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;
