"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = exports.AuthRepository = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../../../infra/database/prisma");
const env_1 = require("../../../config/env");
const AppError_1 = require("../../../shared/errors/AppError");
class AuthRepository {
    async findByEmail(email) {
        return prisma_1.prisma.user.findFirst({
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
    async findById(id) {
        return prisma_1.prisma.user.findFirst({
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
    async createRefreshToken(userId, token, expiresAt) {
        return prisma_1.prisma.refreshToken.create({
            data: { userId, token, expiresAt },
        });
    }
    async findRefreshToken(token) {
        return prisma_1.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });
    }
    async revokeRefreshToken(token) {
        return prisma_1.prisma.refreshToken.update({
            where: { token },
            data: { revokedAt: new Date() },
        });
    }
    async revokeAllUserTokens(userId) {
        return prisma_1.prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async updateLastLogin(userId) {
        return prisma_1.prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    }
}
exports.AuthRepository = AuthRepository;
class AuthService {
    repo;
    constructor(repo = new AuthRepository()) {
        this.repo = repo;
    }
    mapUser(user) {
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
    generateTokens(payload) {
        const accessToken = jsonwebtoken_1.default.sign(payload, env_1.env.JWT_ACCESS_SECRET, { expiresIn: 900 });
        const refreshToken = crypto_1.default.randomBytes(64).toString('hex');
        return {
            accessToken,
            refreshToken,
            expiresIn: 900,
        };
    }
    async login(email, password) {
        const user = await this.repo.findByEmail(email);
        if (!user || user.status !== 'ACTIVE') {
            throw new AppError_1.UnauthorizedError('Invalid credentials');
        }
        const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!valid) {
            throw new AppError_1.UnauthorizedError('Invalid credentials');
        }
        const permissions = user.role.permissions.map((rp) => rp.permission.code);
        const payload = {
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
    async refresh(refreshToken) {
        const stored = await this.repo.findRefreshToken(refreshToken);
        if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
            throw new AppError_1.UnauthorizedError('Invalid refresh token');
        }
        const user = await this.repo.findById(stored.userId);
        if (!user)
            throw new AppError_1.NotFoundError('User');
        const permissions = user.role.permissions.map((rp) => rp.permission.code);
        const payload = {
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
    async logout(refreshToken) {
        await this.repo.revokeRefreshToken(refreshToken);
    }
    async me(userId) {
        const user = await this.repo.findById(userId);
        if (!user)
            throw new AppError_1.NotFoundError('User');
        return this.mapUser(user);
    }
}
exports.AuthService = AuthService;
