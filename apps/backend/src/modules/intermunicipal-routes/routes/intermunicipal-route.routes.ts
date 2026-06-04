import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { IntermunicipalRouteStatus } from '@prisma/client';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission, requireRole } from '../../../middlewares/role.middleware';
import { routeMunicipalityService } from '../service/route-municipality.service';
import { createIntermunicipalRouteService } from '../service/intermunicipal-route.service';
import type { Server } from 'socket.io';

const municipalitySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().optional(),
  }),
});

const routeCreateSchema = z.object({
  body: z.object({
    routeCode: z.string().min(2),
    routeDate: z.string(),
    driverId: z.string().cuid(),
    municipalityId: z.string().cuid(),
    observations: z.string().optional(),
  }),
});

const addDeliveriesSchema = z.object({
  params: z.object({ id: z.string().cuid() }),
  body: z.object({ deliveryIds: z.array(z.string().cuid()).min(1) }),
});

export function createIntermunicipalRouteRoutes(io?: Server) {
  const router = Router();
  const service = createIntermunicipalRouteService(io);

  router.get(
    '/municipalities',
    requirePermission('intermunicipal_routes.read', 'route_municipalities.read'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const result = await routeMunicipalityService.list(
          Number(req.query.page) || 1,
          Number(req.query.limit) || 50,
          req.query.search as string,
          req.query.activeOnly === 'true'
        );
        res.json({ success: true, ...result });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/municipalities',
    requireRole('ADMIN'),
    validate(municipalitySchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await routeMunicipalityService.create(req.body);
        res.status(201).json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/municipalities/:id',
    requireRole('ADMIN'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await routeMunicipalityService.update(routeParam(req.params.id), req.body);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/municipalities/:id/active',
    requireRole('ADMIN'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await routeMunicipalityService.setActive(routeParam(req.params.id), req.body.isActive !== false);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/dashboard',
    requirePermission('intermunicipal_routes.read', 'dashboard.read', 'deliveries.read'),
    async (_req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.getDashboard();
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/drivers',
    requirePermission('intermunicipal_routes.read', 'intermunicipal_routes.write'),
    async (_req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.listDrivers();
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/drivers/:driverId/active-routes',
    requirePermission('intermunicipal_routes.read', 'intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.getDriverActiveRoutes(routeParam(req.params.driverId));
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/my',
    requirePermission('courier.app'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.listMyRoutes(
          req.user!.sub,
          req.query.status as IntermunicipalRouteStatus | undefined
        );
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/',
    requirePermission('intermunicipal_routes.read', 'deliveries.read', 'calls.read'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const result = await service.list({
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          status: req.query.status as IntermunicipalRouteStatus,
          municipalityId: req.query.municipalityId as string,
          driverId: req.query.driverId as string,
          dateFrom: req.query.dateFrom as string,
          dateTo: req.query.dateTo as string,
        });
        res.json({ success: true, ...result });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/:id',
    requirePermission('intermunicipal_routes.read', 'courier.app', 'deliveries.read', 'calls.read'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.getById(routeParam(req.params.id));
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/',
    requirePermission('intermunicipal_routes.write'),
    validate(routeCreateSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.create(req.body, req.user!.sub);
        res.status(201).json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/:id',
    requirePermission('intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.update(routeParam(req.params.id), req.body, req.user!.sub);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/deliveries',
    requirePermission(
      'intermunicipal_routes.write',
      'intermunicipal_routes.add_deliveries',
      'calls.write'
    ),
    validate(addDeliveriesSchema),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.addDeliveries(routeParam(req.params.id), req.body.deliveryIds, req.user!.sub);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/:id/deliveries/:deliveryId',
    requirePermission(
      'intermunicipal_routes.write',
      'intermunicipal_routes.add_deliveries',
      'calls.write'
    ),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.removeDelivery(routeParam(req.params.id), routeParam(req.params.deliveryId), req.user!.sub);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/dispatch',
    requirePermission('intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.dispatch(routeParam(req.params.id), req.user!.sub);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/start',
    requirePermission('intermunicipal_routes.write', 'courier.app'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.startRoute(routeParam(req.params.id), req.user!.sub);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/close',
    requirePermission('intermunicipal_routes.write', 'courier.app'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const user = req.user!;
        const canManageRoutes =
          user.role === 'ADMIN' || user.permissions.includes('intermunicipal_routes.write');
        const data = await service.close(routeParam(req.params.id), user.sub, req.body.notes, {
          requireAssignedDriver: !canManageRoutes,
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/cancel',
    requirePermission('intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.cancel(routeParam(req.params.id), req.user!.sub, req.body.notes);
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/transfer-driver',
    requirePermission('intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.transferDriver(
          routeParam(req.params.id),
          req.body.newDriverId,
          req.user!.sub,
          req.body.notes
        );
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/:id/split',
    requirePermission('intermunicipal_routes.write'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.splitRoute(routeParam(req.params.id), req.body, req.user!.sub);
        res.status(201).json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/:id/history',
    requirePermission('intermunicipal_routes.read'),
    async (req: AuthRequest, res: Response, next: NextFunction) => {
      try {
        const data = await service.getHistory(routeParam(req.params.id));
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
