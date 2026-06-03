import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../../infra/database/prisma';
import { AuthRequest } from '../../../middlewares/auth.middleware';
import { requirePermission } from '../../../middlewares/role.middleware';

const router = Router();

router.get('/', requirePermission('users.read', 'roles.read'), async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roles = await prisma.role.findMany({
      where: { deletedAt: null, name: { not: 'COURIER' } },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role._count.users,
      permissions: role.permissions.map((rp) => ({
        code: rp.permission.code,
        name: rp.permission.name,
        module: rp.permission.module,
      })),
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/permissions', requirePermission('users.read', 'roles.read'), async (_req, res, next) => {
  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
    res.json({ success: true, data: permissions });
  } catch (error) {
    next(error);
  }
});

export default router;
