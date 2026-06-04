import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { AuthService } from '../service/auth.service';
import { passwordResetService } from '../service/password-reset.service';
import { writeAuditLog } from '../../../shared/audit/audit.service';

const authService = new AuthService();

export class AuthController {
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      await writeAuditLog({
        userId: result.user.id,
        action: 'LOGIN',
        entity: 'User',
        entityId: result.user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') || undefined,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      res.json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(refreshToken);
      if (req.user?.sub) {
        await writeAuditLog({
          userId: req.user.sub,
          action: 'LOGOUT',
          entity: 'User',
          entityId: req.user.sub,
          ipAddress: req.ip,
        });
      }
      res.json({ success: true, message: 'Logged out' });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await passwordResetService.requestReset(req.body.email, req.ip);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await passwordResetService.resetPassword(
        req.body.token,
        req.body.password,
        req.ip
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async me(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.me(req.user!.sub);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
