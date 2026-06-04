import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}
export declare function requestLogger(req: Request, res: Response, next: NextFunction): void;
