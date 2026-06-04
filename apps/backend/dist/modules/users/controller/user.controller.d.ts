import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
export declare class UserController {
    list(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    create(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    update(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    activate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    deactivate(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    resetPassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    changeStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
export declare const userController: UserController;
