import { prisma } from '../../../infra/database/prisma';
import { paginate, buildPaginationMeta } from '@pharma/utils';
import { ConflictError, NotFoundError, ValidationError } from '../../../shared/errors/AppError';

export class RouteMunicipalityService {
  async list(page = 1, limit = 50, search?: string, activeOnly?: boolean) {
    const { skip, take } = paginate(page, limit);
    const where = {
      deletedAt: null,
      ...(activeOnly && { isActive: true }),
      ...(search?.trim() && {
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' as const } },
          { code: { contains: search.trim(), mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.routeMunicipality.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.routeMunicipality.count({ where }),
    ]);

    return { data, meta: buildPaginationMeta(total, page, limit) };
  }

  async create(input: { name: string; code?: string }) {
    const existing = await prisma.routeMunicipality.findFirst({
      where: { name: input.name, deletedAt: null },
    });
    if (existing) throw new ConflictError(`Ya existe el municipio ${input.name}`);

    return prisma.routeMunicipality.create({
      data: { name: input.name, code: input.code, isActive: true },
    });
  }

  async update(id: string, input: { name?: string; code?: string }) {
    const item = await prisma.routeMunicipality.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('Municipality');

    if (input.name && input.name !== item.name) {
      const dup = await prisma.routeMunicipality.findFirst({
        where: { name: input.name, deletedAt: null, id: { not: id } },
      });
      if (dup) throw new ConflictError(`Ya existe el municipio ${input.name}`);
    }

    return prisma.routeMunicipality.update({
      where: { id },
      data: { ...(input.name && { name: input.name }), ...(input.code !== undefined && { code: input.code }) },
    });
  }

  async setActive(id: string, isActive: boolean) {
    const item = await prisma.routeMunicipality.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new NotFoundError('Municipality');
    return prisma.routeMunicipality.update({ where: { id }, data: { isActive } });
  }
}

export const routeMunicipalityService = new RouteMunicipalityService();
