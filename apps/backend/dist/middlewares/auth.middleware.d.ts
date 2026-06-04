import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '@pharma/types';
export interface AuthRequest extends Request<Record<string, string>> {
    user?: JwtPayload;
}
export declare function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
