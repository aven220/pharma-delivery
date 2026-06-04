"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.passwordResetService = exports.PasswordResetService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../../infra/database/prisma");
const env_1 = require("../../../config/env");
const logger_1 = require("../../../config/logger");
const AppError_1 = require("../../../shared/errors/AppError");
const audit_service_1 = require("../../../shared/audit/audit.service");
function hashToken(token) {
    return crypto_1.default.createHash('sha256').update(token).digest('hex');
}
async function sendResetEmail(email, resetUrl) {
    if (env_1.env.SMTP_HOST && env_1.env.SMTP_USER && env_1.env.SMTP_PASS && env_1.env.SMTP_FROM) {
        const nodemailer = await Promise.resolve().then(() => __importStar(require('nodemailer')));
        const transport = nodemailer.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT || 587,
            secure: (env_1.env.SMTP_PORT || 587) === 465,
            auth: { user: env_1.env.SMTP_USER, pass: env_1.env.SMTP_PASS },
        });
        await transport.sendMail({
            from: env_1.env.SMTP_FROM,
            to: email,
            subject: 'A-AS Delivery — Recuperación de contraseña',
            text: `Use este enlace para restablecer su contraseña (válido 1 hora):\n\n${resetUrl}`,
            html: `<p>Use este enlace para restablecer su contraseña (válido 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
        });
        return;
    }
    logger_1.logger.info('Password reset link (SMTP no configurado)', { email, resetUrl });
}
class PasswordResetService {
    async requestReset(email, ipAddress) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { email: email.toLowerCase().trim(), deletedAt: null, status: 'ACTIVE' },
        });
        if (!user) {
            return { message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña.' };
        }
        await prisma_1.prisma.passwordResetToken.updateMany({
            where: { userId: user.id, usedAt: null },
            data: { usedAt: new Date() },
        });
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        await prisma_1.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(rawToken),
                expiresAt,
            },
        });
        const baseUrl = env_1.env.APP_PUBLIC_URL || 'http://localhost:5173';
        const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
        await sendResetEmail(user.email, resetUrl);
        await (0, audit_service_1.writeAuditLog)({
            userId: user.id,
            action: 'UPDATE',
            entity: 'User',
            entityId: user.id,
            newData: { event: 'PASSWORD_RESET_REQUESTED' },
            ipAddress,
        });
        return {
            message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña.',
            ...(env_1.isDev ? { devResetUrl: resetUrl } : {}),
        };
    }
    async resetPassword(token, newPassword, ipAddress) {
        if (newPassword.length < 8) {
            throw new AppError_1.ValidationError('La contraseña debe tener al menos 8 caracteres');
        }
        const record = await prisma_1.prisma.passwordResetToken.findFirst({
            where: {
                tokenHash: hashToken(token),
                usedAt: null,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!record || record.user.deletedAt || record.user.status !== 'ACTIVE') {
            throw new AppError_1.NotFoundError('Token de recuperación inválido o expirado');
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 12);
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: record.userId },
                data: { passwordHash },
            }),
            prisma_1.prisma.passwordResetToken.update({
                where: { id: record.id },
                data: { usedAt: new Date() },
            }),
            prisma_1.prisma.refreshToken.updateMany({
                where: { userId: record.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            }),
        ]);
        await (0, audit_service_1.writeAuditLog)({
            userId: record.userId,
            action: 'UPDATE',
            entity: 'User',
            entityId: record.userId,
            newData: { event: 'PASSWORD_RESET_COMPLETED' },
            ipAddress,
        });
        return { message: 'Contraseña actualizada correctamente' };
    }
}
exports.PasswordResetService = PasswordResetService;
exports.passwordResetService = new PasswordResetService();
