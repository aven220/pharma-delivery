import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { userService } from '../service/user.service';

export class UserController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.list(req.query as never);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.getById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.create(req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.changeStatus(req.params.id, 'ACTIVE');
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.changeStatus(req.params.id, 'INACTIVE');
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await userService.resetPassword(req.params.id, req.body.password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async changeStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await userService.changeStatus(req.params.id, req.body.status);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
