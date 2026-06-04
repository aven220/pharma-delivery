"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeMunicipalityService = exports.RouteMunicipalityService = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const utils_1 = require("@pharma/utils");
const AppError_1 = require("../../../shared/errors/AppError");
class RouteMunicipalityService {
    async list(page = 1, limit = 50, search, activeOnly) {
        const { skip, take } = (0, utils_1.paginate)(page, limit);
        const where = {
            deletedAt: null,
            ...(activeOnly && { isActive: true }),
            ...(search?.trim() && {
                OR: [
                    { name: { contains: search.trim(), mode: 'insensitive' } },
                    { code: { contains: search.trim(), mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma_1.prisma.routeMunicipality.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
            prisma_1.prisma.routeMunicipality.count({ where }),
        ]);
        return { data, meta: (0, utils_1.buildPaginationMeta)(total, page, limit) };
    }
    async create(input) {
        const existing = await prisma_1.prisma.routeMunicipality.findFirst({
            where: { name: input.name, deletedAt: null },
        });
        if (existing)
            throw new AppError_1.ConflictError(`Ya existe el municipio ${input.name}`);
        return prisma_1.prisma.routeMunicipality.create({
            data: { name: input.name, code: input.code, isActive: true },
        });
    }
    async update(id, input) {
        const item = await prisma_1.prisma.routeMunicipality.findFirst({ where: { id, deletedAt: null } });
        if (!item)
            throw new AppError_1.NotFoundError('Municipality');
        if (input.name && input.name !== item.name) {
            const dup = await prisma_1.prisma.routeMunicipality.findFirst({
                where: { name: input.name, deletedAt: null, id: { not: id } },
            });
            if (dup)
                throw new AppError_1.ConflictError(`Ya existe el municipio ${input.name}`);
        }
        return prisma_1.prisma.routeMunicipality.update({
            where: { id },
            data: { ...(input.name && { name: input.name }), ...(input.code !== undefined && { code: input.code }) },
        });
    }
    async setActive(id, isActive) {
        const item = await prisma_1.prisma.routeMunicipality.findFirst({ where: { id, deletedAt: null } });
        if (!item)
            throw new AppError_1.NotFoundError('Municipality');
        return prisma_1.prisma.routeMunicipality.update({ where: { id }, data: { isActive } });
    }
}
exports.RouteMunicipalityService = RouteMunicipalityService;
exports.routeMunicipalityService = new RouteMunicipalityService();
