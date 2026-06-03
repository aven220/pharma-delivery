import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { ForbiddenError } from '../shared/errors/AppError';

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient role'));
      return;
    }
    next();
  };
}

export function requirePermission(...permissions: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError());
      return;
    }
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }
    const hasPermission = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
}
