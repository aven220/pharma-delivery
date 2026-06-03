import { Router } from 'express';
import { createDeliveryController } from '../controller/delivery.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';
import {
  listDeliveriesSchema,
  getDeliverySchema,
  updateDeliveryStatusSchema,
} from '../validators/delivery.validators';
import type { Server } from 'socket.io';

export function createDeliveryRoutes(io?: Server) {
  const router = Router();
  const controller = createDeliveryController(io);

  router.use(authMiddleware);

  router.get(
    '/',
    requirePermission('deliveries.read', 'audit.read'),
    validate(listDeliveriesSchema),
    controller.list.bind(controller)
  );

  router.get(
    '/my',
    requirePermission('deliveries.read', 'courier.app'),
    controller.myDeliveries.bind(controller)
  );

  router.get(
    '/:id',
    requirePermission('deliveries.read', 'audit.read', 'courier.app'),
    validate(getDeliverySchema),
    controller.getById.bind(controller)
  );

  router.patch(
    '/:id/status',
    requirePermission('deliveries.write', 'courier.app'),
    validate(updateDeliveryStatusSchema),
    controller.updateStatus.bind(controller)
  );

  return router;
}
