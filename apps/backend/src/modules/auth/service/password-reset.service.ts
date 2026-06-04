import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../infra/database/prisma';
import { env, isDev } from '../../../config/env';
import { logger } from '../../../config/logger';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { writeAuditLog } from '../../../shared/audit/audit.service';

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function sendResetEmail(email: string, resetUrl: string) {
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM) {
    const nodemailer = await import('nodemailer');
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: (env.SMTP_PORT || 587) === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject: 'A-AS Delivery — Recuperación de contraseña',
      text: `Use este enlace para restablecer su contraseña (válido 1 hora):\n\n${resetUrl}`,
      html: `<p>Use este enlace para restablecer su contraseña (válido 1 hora):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
    return;
  }

  logger.info('Password reset link (SMTP no configurado)', { email, resetUrl });
}

export class PasswordResetService {
  async requestReset(email: string, ipAddress?: string) {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), deletedAt: null, status: 'ACTIVE' },
    });

    if (!user) {
      return { message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña.' };
    }

    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    const baseUrl = env.APP_PUBLIC_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

    await sendResetEmail(user.email, resetUrl);

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      newData: { event: 'PASSWORD_RESET_REQUESTED' },
      ipAddress,
    });

    return {
      message: 'Si el correo existe, recibirá instrucciones para restablecer la contraseña.',
      ...(isDev ? { devResetUrl: resetUrl } : {}),
    };
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string) {
    if (newPassword.length < 8) {
      throw new ValidationError('La contraseña debe tener al menos 8 caracteres');
    }

    const record = await prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!record || record.user.deletedAt || record.user.status !== 'ACTIVE') {
      throw new NotFoundError('Token de recuperación inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await writeAuditLog({
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

export const passwordResetService = new PasswordResetService();
