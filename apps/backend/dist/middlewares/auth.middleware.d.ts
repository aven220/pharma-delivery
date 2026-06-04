import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '@pharma/types';
/** Normaliza parámetros de ruta Express (string | string[] → string). */
export declare function routeParam(value: string | string[] | undefined): string;
export interface AuthRequest extends Request<Record<string, string>> {
    user?: JwtPayload;
}
export declare function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
