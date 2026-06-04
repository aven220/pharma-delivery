"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controller/user.controller");
const validate_middleware_1 = require("../../../middlewares/validate.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const user_validators_1 = require("../validators/user.validators");
const prisma_1 = require("../../../infra/database/prisma");
const router = (0, express_1.Router)();
router.get('/', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.listUsersSchema), user_controller_1.userController.list.bind(user_controller_1.userController));
router.get('/couriers', (0, role_middleware_1.requirePermission)('assignments.write', 'deliveries.read'), async (_req, res, next) => {
    try {
        const couriers = await prisma_1.prisma.courier.findMany({
            where: { deletedAt: null },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });
        res.json({ success: true, data: couriers });
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.userIdSchema), user_controller_1.userController.getById.bind(user_controller_1.userController));
router.post('/', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.createUserSchema), user_controller_1.userController.create.bind(user_controller_1.userController));
router.patch('/:id', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.updateUserSchema), user_controller_1.userController.update.bind(user_controller_1.userController));
router.patch('/:id/activate', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.userIdSchema), user_controller_1.userController.activate.bind(user_controller_1.userController));
router.patch('/:id/deactivate', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.userIdSchema), user_controller_1.userController.deactivate.bind(user_controller_1.userController));
router.patch('/:id/status', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.changeStatusSchema), user_controller_1.userController.changeStatus.bind(user_controller_1.userController));
router.post('/:id/reset-password', (0, role_middleware_1.requireRole)('ADMIN'), (0, validate_middleware_1.validate)(user_validators_1.resetPasswordSchema), user_controller_1.userController.resetPassword.bind(user_controller_1.userController));
exports.default = router;
