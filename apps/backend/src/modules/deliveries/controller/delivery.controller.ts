import { Response, NextFunction } from 'express';
import { AuthRequest, routeParam } from '../../../middlewares/auth.middleware';
import { DeliveryService } from '../service/delivery.service';
import type { Server } from 'socket.io';

const deliveryService = new DeliveryService();

export class DeliveryController {
  constructor(private io?: Server) {}

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await deliveryService.list(req.query as never);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.getById(routeParam(req.params.id));
      res.json({ success: true, data: delivery });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const delivery = await deliveryService.updateStatus(
        routeParam(req.params.id),
        req.user!.sub,
        req.body
      );
      const event =
        delivery.status === 'DELIVERED'
          ? 'delivery.completed'
          : 'delivery.updated';
      this.io?.emit(event, delivery);
      res.json({ success: true, data: delivery });
    } catch (error) {
      next(error);
    }
  }

  async myDeliveries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const result = await deliveryService.getCourierDeliveries(req.user!.sub, page, limit);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export function createDeliveryController(io?: Server) {
  return new DeliveryController(io);
}
