import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import type { Server } from 'socket.io';
export declare class DeliveryController {
    private io?;
    constructor(io?: Server | undefined);
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    updateStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    myDeliveries(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare function createDeliveryController(io?: Server): DeliveryController;
