import { Router } from 'express';
import { authController } from '../controller/auth.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { authRateLimiter } from '../../../middlewares/rateLimit.middleware';
import { loginSchema, refreshSchema, logoutSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validators';

const router = Router();

router.post('/login', authRateLimiter, validate(loginSchema), authController.login.bind(authController));
router.post('/refresh', validate(refreshSchema), authController.refresh.bind(authController));
router.post('/logout', validate(logoutSchema), authController.logout.bind(authController));
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get('/me', authMiddleware, authController.me.bind(authController));

export default router;
