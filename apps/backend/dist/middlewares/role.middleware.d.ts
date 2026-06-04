import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
export declare function requireRole(...roles: string[]): (req: AuthRequest, _res: Response, next: NextFunction) => void;
export declare function requirePermission(...permissions: string[]): (req: AuthRequest, _res: Response, next: NextFunction) => void;
