"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("../service/auth.service");
const password_reset_service_1 = require("../service/password-reset.service");
const audit_service_1 = require("../../../shared/audit/audit.service");
const authService = new auth_service_1.AuthService();
class AuthController {
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            await (0, audit_service_1.writeAuditLog)({
                userId: result.user.id,
                action: 'LOGIN',
                entity: 'User',
                entityId: result.user.id,
                ipAddress: req.ip,
                userAgent: req.get('user-agent') || undefined,
            });
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;
            const tokens = await authService.refresh(refreshToken);
            res.json({ success: true, data: tokens });
        }
        catch (error) {
            next(error);
        }
    }
    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;
            await authService.logout(refreshToken);
            if (req.user?.sub) {
                await (0, audit_service_1.writeAuditLog)({
                    userId: req.user.sub,
                    action: 'LOGOUT',
                    entity: 'User',
                    entityId: req.user.sub,
                    ipAddress: req.ip,
                });
            }
            res.json({ success: true, message: 'Logged out' });
        }
        catch (error) {
            next(error);
        }
    }
    async forgotPassword(req, res, next) {
        try {
            const result = await password_reset_service_1.passwordResetService.requestReset(req.body.email, req.ip);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async resetPassword(req, res, next) {
        try {
            const result = await password_reset_service_1.passwordResetService.resetPassword(req.body.token, req.body.password, req.ip);
            res.json({ success: true, data: result });
        }
        catch (error) {
            next(error);
        }
    }
    async me(req, res, next) {
        try {
            const user = await authService.me(req.user.sub);
            res.json({ success: true, data: user });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
