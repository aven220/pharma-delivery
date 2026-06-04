"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../../../infra/database/prisma");
const utils_1 = require("@pharma/utils");
const AppError_1 = require("../../../shared/errors/AppError");
const userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    documentId: true,
    status: true,
    operationalType: true,
    roleId: true,
    role: { select: { id: true, name: true, description: true } },
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
    courierProfile: { select: { id: true, code: true } },
    operatorProfile: { select: { id: true, code: true } },
};
class UserService {
    async list(filters) {
        const { skip, take, page, limit } = (0, utils_1.paginate)(filters.page, filters.limit);
        const where = {
            deletedAt: null,
            ...(filters.status && { status: filters.status }),
            ...(filters.roleId && { roleId: filters.roleId }),
            ...(filters.search && {
                OR: [
                    { email: { contains: filters.search, mode: 'insensitive' } },
                    { firstName: { contains: filters.search, mode: 'insensitive' } },
                    { lastName: { contains: filters.search, mode: 'insensitive' } },
                    { documentId: { contains: filters.search } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma_1.prisma.user.findMany({ where, skip, take, select: userSelect, orderBy: { createdAt: 'desc' } }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return { data, meta: (0, utils_1.buildPaginationMeta)(total, page, limit) };
    }
    async getById(id) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { id, deletedAt: null },
            select: userSelect,
        });
        if (!user)
            throw new AppError_1.NotFoundError('User');
        return user;
    }
    async create(input) {
        const existing = await prisma_1.prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
        if (existing)
            throw new AppError_1.ConflictError('Email already registered');
        const role = await prisma_1.prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null } });
        if (!role)
            throw new AppError_1.NotFoundError('Role');
        const passwordHash = await bcryptjs_1.default.hash(input.password, 12);
        return prisma_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: input.email,
                    passwordHash,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    phone: input.phone,
                    documentId: input.documentId,
                    roleId: input.roleId,
                    operationalType: input.operationalType || 'DOMICILIARIO',
                    status: 'ACTIVE',
                },
                select: userSelect,
            });
            if (role.name === 'DOMICILIARIO' || role.name === 'COURIER') {
                const code = `DOM-${Date.now().toString().slice(-6)}`;
                await tx.courier.create({ data: { userId: user.id, code } });
            }
            if (role.name === 'OPERATOR') {
                const code = `OP-${Date.now().toString().slice(-6)}`;
                await tx.operator.create({ data: { userId: user.id, code } });
            }
            return tx.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect });
        });
    }
    async update(id, input) {
        const user = await this.getById(id);
        if (input.email && input.email !== user.email) {
            const dup = await prisma_1.prisma.user.findFirst({ where: { email: input.email, deletedAt: null, NOT: { id } } });
            if (dup)
                throw new AppError_1.ConflictError('Email already registered');
        }
        if (input.roleId && input.roleId !== user.roleId) {
            await this.syncRoleProfiles(id, input.roleId);
        }
        return prisma_1.prisma.user.update({
            where: { id },
            data: input,
            select: userSelect,
        });
    }
    async changeStatus(id, status) {
        await this.getById(id);
        return prisma_1.prisma.user.update({ where: { id }, data: { status }, select: userSelect });
    }
    async resetPassword(id, password) {
        await this.getById(id);
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        await prisma_1.prisma.user.update({ where: { id }, data: { passwordHash } });
        await prisma_1.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        return { message: 'Password reset successfully' };
    }
    async softDelete(id) {
        await this.getById(id);
        return prisma_1.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'INACTIVE' },
            select: userSelect,
        });
    }
    async syncRoleProfiles(userId, roleId) {
        const role = await prisma_1.prisma.role.findUnique({ where: { id: roleId } });
        if (!role)
            throw new AppError_1.NotFoundError('Role');
        const isCourier = role.name === 'DOMICILIARIO' || role.name === 'COURIER';
        const isOperator = role.name === 'OPERATOR';
        const courier = await prisma_1.prisma.courier.findUnique({ where: { userId } });
        const operator = await prisma_1.prisma.operator.findUnique({ where: { userId } });
        if (isCourier && !courier) {
            await prisma_1.prisma.courier.create({ data: { userId, code: `DOM-${Date.now().toString().slice(-6)}` } });
        }
        if (isOperator && !operator) {
            await prisma_1.prisma.operator.create({ data: { userId, code: `OP-${Date.now().toString().slice(-6)}` } });
        }
    }
}
exports.UserService = UserService;
exports.userService = new UserService();
