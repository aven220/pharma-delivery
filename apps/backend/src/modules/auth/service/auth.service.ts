import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../../infra/database/prisma';
import { env } from '../../../config/env';
import { UnauthorizedError, NotFoundError } from '../../../shared/errors/AppError';
import type { AuthTokens, JwtPayload, UserDTO } from '@pharma/types';

export class AuthRepository {
  async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });
  }

  async createRefreshToken(userId: string, token: string, expiresAt: Date) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt },
    });
  }

  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async revokeRefreshToken(token: string) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }
}

export class AuthService {
  constructor(private repo = new AuthRepository()) {}

  private mapUser(user: NonNullable<Awaited<ReturnType<AuthRepository['findByEmail']>>>): UserDTO {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: { id: user.role.id, name: user.role.name },
      operationalType: user.operationalType,
      permissions: user.role.permissions.map((rp) => rp.permission.code),
    };
  }

  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    };

    const tokens = this.generateTokens(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.createRefreshToken(user.id, tokens.refreshToken, expiresAt);
    await this.repo.updateLastLogin(user.id);

    return { user: this.mapUser(user), tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.repo.findRefreshToken(refreshToken);
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await this.repo.findById(stored.userId);
    if (!user) throw new NotFoundError('User');

    const permissions = user.role.permissions.map((rp) => rp.permission.code);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions,
    };

    await this.repo.revokeRefreshToken(refreshToken);
    const tokens = this.generateTokens(payload);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.repo.createRefreshToken(user.id, tokens.refreshToken, expiresAt);

    return tokens;
  }

  async logout(refreshToken: string) {
    await this.repo.revokeRefreshToken(refreshToken);
  }

  async me(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('User');
    return this.mapUser(user);
  }
}
