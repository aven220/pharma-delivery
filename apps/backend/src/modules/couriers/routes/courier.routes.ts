import { Router, Response, NextFunction } from 'express';
import type { Server } from 'socket.io';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import { courierPanelService } from '../service/courier-panel.service';
import { courierRouteService } from '../service/courier-route.service';

export function createCourierRoutes(io?: Server) {
  const router = Router();

router.get('/routes', requirePermission('couriers.read', 'assignments.write', 'dashboard.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    const data = await courierRouteService.listRoutes({
      courierId: req.query.courierId as string | undefined,
      dateFrom,
      dateTo,
      status: req.query.status as never,
    });
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/routes/today/:courierId', requirePermission('couriers.read', 'assignments.write'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await courierRouteService.getTodayRoute(req.params.courierId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/routes/:id/carry-over', requirePermission('assignments.write', 'couriers.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { targetDate } = req.body as { targetDate: string };
    if (!targetDate) {
      res.status(400).json({ success: false, message: 'targetDate es requerido' });
      return;
    }
    const data = await courierRouteService.carryOverPending(req.params.id, targetDate, req.user!.sub);
    io?.to(`user:${data.previousRoute.courierId}`).emit('route.carry_over', {
      routeId: data.nextRoute.id,
      movedCount: data.movedCount,
      targetDate,
    });
    io?.to('admin').emit('route.carry_over', data);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.post('/routes/:id/close', requirePermission('assignments.write', 'couriers.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { notes } = req.body as { notes?: string };
    const data = await courierRouteService.closeRoute(req.params.id, req.user!.sub, notes);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/', requirePermission('couriers.read', 'assignments.write', 'dashboard.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
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

router.get('/panel', requirePermission('couriers.read', 'dashboard.read'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await courierPanelService.getPanelOverview();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requirePermission('couriers.read', 'dashboard.read'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await courierPanelService.getCourierDetail(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

  return router;
}

export default createCourierRoutes();
