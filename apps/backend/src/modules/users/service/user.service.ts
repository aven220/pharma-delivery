import bcrypt from 'bcryptjs';
import { UserStatus } from '@prisma/client';
import { prisma } from '../../../infra/database/prisma';
import { paginate, buildPaginationMeta } from '@pharma/utils';
import { NotFoundError, ConflictError, ValidationError } from '../../../shared/errors/AppError';

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

export class UserService {
  async list(filters: {
    page: number;
    limit: number;
    search?: string;
    status?: UserStatus;
    roleId?: string;
  }) {
    const { skip, take, page, limit } = paginate(filters.page, filters.limit);
    const where = {
      deletedAt: null,
      ...(filters.status && { status: filters.status }),
      ...(filters.roleId && { roleId: filters.roleId }),
      ...(filters.search && {
        OR: [
          { email: { contains: filters.search, mode: 'insensitive' as const } },
          { firstName: { contains: filters.search, mode: 'insensitive' as const } },
          { lastName: { contains: filters.search, mode: 'insensitive' as const } },
          { documentId: { contains: filters.search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({ where, skip, take, select: userSelect, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new NotFoundError('User');
    return user;
  }

  async create(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    documentId?: string;
    roleId: string;
    operationalType?: 'DOMICILIARIO' | 'CONDUCTOR_RUTA';
  }) {
    const existing = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null } });
    if (existing) throw new ConflictError('Email already registered');

    const role = await prisma.role.findFirst({ where: { id: input.roleId, deletedAt: null } });
    if (!role) throw new NotFoundError('Role');

    const passwordHash = await bcrypt.hash(input.password, 12);

    return prisma.$transaction(async (tx) => {
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

  async update(
    id: string,
    input: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      documentId?: string;
      roleId?: string;
      status?: UserStatus;
      operationalType?: 'DOMICILIARIO' | 'CONDUCTOR_RUTA';
    }
  ) {
    const user = await this.getById(id);

    if (input.email && input.email !== user.email) {
      const dup = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null, NOT: { id } } });
      if (dup) throw new ConflictError('Email already registered');
    }

    if (input.roleId && input.roleId !== user.roleId) {
      await this.syncRoleProfiles(id, input.roleId);
    }

    return prisma.user.update({
      where: { id },
      data: input,
      select: userSelect,
    });
  }

  async changeStatus(id: string, status: UserStatus) {
    await this.getById(id);
    return prisma.user.update({ where: { id }, data: { status }, select: userSelect });
  }

  async resetPassword(id: string, password: string) {
    await this.getById(id);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });
    await prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { message: 'Password reset successfully' };
  }

  async softDelete(id: string) {
    await this.getById(id);
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
      select: userSelect,
    });
  }

  private async syncRoleProfiles(userId: string, roleId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError('Role');

    const isCourier = role.name === 'DOMICILIARIO' || role.name === 'COURIER';
    const isOperator = role.name === 'OPERATOR';

    const courier = await prisma.courier.findUnique({ where: { userId } });
    const operator = await prisma.operator.findUnique({ where: { userId } });

    if (isCourier && !courier) {
      await prisma.courier.create({ data: { userId, code: `DOM-${Date.now().toString().slice(-6)}` } });
    }
    if (isOperator && !operator) {
      await prisma.operator.create({ data: { userId, code: `OP-${Date.now().toString().slice(-6)}` } });
    }
  }
}

export const userService = new UserService();
