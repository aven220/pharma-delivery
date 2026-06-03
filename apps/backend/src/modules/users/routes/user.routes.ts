import { Router } from 'express';
import { userController } from '../controller/user.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { requirePermission, requireRole } from '../../../middlewares/role.middleware';
import {
  listUsersSchema,
  userIdSchema,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  changeStatusSchema,
} from '../validators/user.validators';
import { prisma } from '../../../infra/database/prisma';

const router = Router();

router.get(
  '/',
  requireRole('ADMIN'),
  validate(listUsersSchema),
  userController.list.bind(userController)
);

router.get('/couriers', requirePermission('assignments.write', 'deliveries.read'), async (_req, res, next) => {
  try {
    const couriers = await prisma.courier.findMany({
      where: { deletedAt: null },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      },
    });
    res.json({ success: true, data: couriers });
  } catch (error) {
    next(error);
  }
});

router.get(
  '/:id',
  requireRole('ADMIN'),
  validate(userIdSchema),
  userController.getById.bind(userController)
);

router.post(
  '/',
  requireRole('ADMIN'),
  validate(createUserSchema),
  userController.create.bind(userController)
);

router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateUserSchema),
  userController.update.bind(userController)
);

router.patch(
  '/:id/activate',
  requireRole('ADMIN'),
  validate(userIdSchema),
  userController.activate.bind(userController)
);

router.patch(
  '/:id/deactivate',
  requireRole('ADMIN'),
  validate(userIdSchema),
  userController.deactivate.bind(userController)
);

router.patch(
  '/:id/status',
  requireRole('ADMIN'),
  validate(changeStatusSchema),
  userController.changeStatus.bind(userController)
);

router.post(
  '/:id/reset-password',
  requireRole('ADMIN'),
  validate(resetPasswordSchema),
  userController.resetPassword.bind(userController)
);

export default router;
