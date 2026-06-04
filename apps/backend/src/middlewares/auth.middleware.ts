import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '@pharma/types';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../shared/errors/AppError';

export interface AuthRequest extends Request<Record<string, string>> {
  user?: JwtPayload;
}

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthorizedError('No token provided'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  try {
    req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as JwtPayload;
  } catch {
    // ignore
  }
  next();
}
