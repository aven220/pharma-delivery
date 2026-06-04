"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryService = exports.DeliveryRepository = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const utils_1 = require("@pharma/utils");
const AppError_1 = require("../../../shared/errors/AppError");
const delivery_status_service_1 = require("./delivery-status.service");
const deliveryInclude = {
    patient: true,
    items: { include: { medication: true }, where: { deletedAt: null } },
    assignments: {
        where: { deletedAt: null, status: { notIn: ['CANCELLED', 'REASSIGNED'] } },
        include: {
            courier: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
    },
    evidence: { where: { deletedAt: null } },
    gpsLogs: { take: 1, orderBy: { recordedAt: 'desc' } },
};
class DeliveryRepository {
    async findMany(filters) {
        const { skip, take, page, limit } = (0, utils_1.paginate)(filters.page, filters.limit);
        const where = { deletedAt: null };
        if (filters.status)
            where.status = filters.status;
        if (filters.priority)
            where.priority = filters.priority;
        if (filters.municipalityId)
            where.municipalityId = filters.municipalityId;
        if (filters.courierId) {
            where.assignments = {
                some: { courierId: filters.courierId, deletedAt: null },
            };
        }
        if (filters.driverId) {
            where.AND = [
                ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
                {
                    OR: [
                        { assignments: { some: { courierId: filters.driverId, deletedAt: null } } },
                        {
                            intermunicipalRouteDeliveries: {
                                some: {
                                    deletedAt: null,
                                    route: { driverId: filters.driverId, deletedAt: null },
                                },
                            },
                        },
                    ],
                },
            ];
        }
        if (filters.assignedById) {
            where.assignments = {
                some: {
                    assignedById: filters.assignedById,
                    deletedAt: null,
                    ...(filters.courierId ? { courierId: filters.courierId } : {}),
                },
            };
        }
        if (filters.search) {
            const searchOr = [
                { deliveryNumber: { contains: filters.search, mode: 'insensitive' } },
                { patient: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                { patient: { lastName: { contains: filters.search, mode: 'insensitive' } } },
                { patient: { documentId: { contains: filters.search } } },
            ];
            where.OR = where.OR ? [...where.OR, ...searchOr] : searchOr;
        }
        const useDeliveredDate = filters.status === 'DELIVERED';
        if (filters.dateFrom || filters.dateTo) {
            if (useDeliveredDate) {
                where.deliveredAt = {};
                if (filters.dateFrom)
                    where.deliveredAt.gte = new Date(filters.dateFrom);
                if (filters.dateTo) {
                    const end = new Date(filters.dateTo);
                    end.setHours(23, 59, 59, 999);
                    where.deliveredAt.lte = end;
                }
            }
            else {
                where.scheduledDate = {};
                if (filters.dateFrom)
                    where.scheduledDate.gte = new Date(filters.dateFrom);
                if (filters.dateTo)
                    where.scheduledDate.lte = new Date(filters.dateTo);
            }
        }
        const [data, total] = await Promise.all([
            prisma_1.prisma.delivery.findMany({
                where,
                include: deliveryInclude,
                skip,
                take,
                orderBy: [{ priority: 'asc' }, { scheduledDate: 'asc' }],
            }),
            prisma_1.prisma.delivery.count({ where }),
        ]);
        return { data, meta: (0, utils_1.buildPaginationMeta)(total, page, limit) };
    }
    async findById(id) {
        return prisma_1.prisma.delivery.findFirst({
            where: { id, deletedAt: null },
            include: deliveryInclude,
        });
    }
    async updateStatus(id, data) {
        return prisma_1.prisma.delivery.update({ where: { id }, data, include: deliveryInclude });
    }
    async createGpsLog(data) {
        return prisma_1.prisma.gpsLog.create({ data: { ...data, recordedAt: new Date() } });
    }
    async countByStatus() {
        const results = await prisma_1.prisma.delivery.groupBy({
            by: ['status'],
            where: { deletedAt: null },
            _count: true,
        });
        return results.reduce((acc, r) => ({ ...acc, [r.status]: r._count }), {});
    }
}
exports.DeliveryRepository = DeliveryRepository;
class DeliveryService {
    repo;
    constructor(repo = new DeliveryRepository()) {
        this.repo = repo;
    }
    mapDelivery(d, assignmentOverride) {
        const assignment = assignmentOverride ?? d.assignments[0];
        return {
            id: d.id,
            deliveryNumber: d.deliveryNumber,
            status: d.status,
            priority: d.priority,
            scheduledDate: d.scheduledDate?.toISOString() ?? null,
            scheduledTime: d.scheduledTime,
            observations: d.observations,
            failureReason: d.failureReason,
            patient: {
                id: d.patient.id,
                documentId: d.patient.documentId,
                firstName: d.patient.firstName,
                lastName: d.patient.lastName,
                phone: d.patient.phone,
                address: d.patient.address,
                lat: d.patient.lat,
                lng: d.patient.lng,
            },
            items: d.items.map((item) => ({
                id: item.id,
                quantity: item.quantity,
                lotNumber: item.lotNumber,
                medication: {
                    id: item.medication.id,
                    code: item.medication.code,
                    name: item.medication.name,
                },
            })),
            assignment: assignment
                ? {
                    id: assignment.id,
                    status: assignment.status,
                    routeOrder: assignment.routeOrder,
                    courier: assignment.courier,
                }
                : null,
            evidenceCount: d.evidence.length,
        };
    }
    async list(filters) {
        const result = await this.repo.findMany(filters);
        return {
            data: result.data.map((d) => this.mapDelivery(d)),
            meta: result.meta,
        };
    }
    async getById(id) {
        const delivery = await this.repo.findById(id);
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        return this.mapDelivery(delivery);
    }
    async updateStatus(id, userId, input) {
        const delivery = await this.repo.findById(id);
        if (!delivery)
            throw new AppError_1.NotFoundError('Delivery');
        if (input.status === 'DELIVERED') {
            const photoCount = delivery.evidence.filter((e) => e.type === 'PHOTO').length;
            if (photoCount < 1) {
                throw new AppError_1.ValidationError('Se requiere al menos una fotografía para marcar como entregado');
            }
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            const updateData = {
                status: input.status,
                ...(input.observations !== undefined && { observations: input.observations }),
            };
            if (input.status === 'DELIVERED' || input.status === 'PARTIALLY_DELIVERED') {
                updateData.deliveredAt = new Date();
            }
            if (input.status === 'FAILED' || input.status === 'NOT_DELIVERED') {
                updateData.failedAt = new Date();
                updateData.failureReason = input.failureReason ?? input.observations;
            }
            if (input.lat !== undefined && input.lng !== undefined) {
                await tx.gpsLog.create({
                    data: {
                        userId,
                        deliveryId: id,
                        lat: input.lat,
                        lng: input.lng,
                        accuracy: input.accuracy,
                    },
                });
            }
            const updated = await tx.delivery.update({
                where: { id },
                data: updateData,
                include: deliveryInclude,
            });
            await delivery_status_service_1.deliveryStatusService.logStatusChange(tx, {
                deliveryId: id,
                fromStatus: delivery.status,
                toStatus: input.status,
                action: 'COURIER_STATUS_UPDATE',
                changedById: userId,
                observations: input.observations,
            });
            return this.mapDelivery(updated);
        });
    }
    async getCourierDeliveries(courierId, page = 1, limit = 50) {
        const { skip, take } = (0, utils_1.paginate)(page, limit);
        const completedDeliveryStatuses = [
            'DELIVERED',
            'PARTIALLY_DELIVERED',
            'NOT_DELIVERED',
            'FAILED',
        ];
        const where = {
            courierId,
            deletedAt: null,
            status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'] },
            delivery: {
                deletedAt: null,
                status: {
                    in: ['ASSIGNED', 'IN_ROUTE', 'CONFIRMED_FOR_DELIVERY', ...completedDeliveryStatuses],
                },
            },
        };
        const [assignments, total] = await Promise.all([
            prisma_1.prisma.assignment.findMany({
                where,
                skip,
                take: 100,
                orderBy: { routeOrder: 'asc' },
                include: {
                    courier: { select: { id: true, firstName: true, lastName: true } },
                    delivery: { include: deliveryInclude },
                },
            }),
            prisma_1.prisma.assignment.count({ where }),
        ]);
        const data = assignments
            .map((a) => this.mapDelivery(a.delivery, {
            id: a.id,
            status: a.status,
            routeOrder: a.routeOrder,
            courier: a.courier,
        }))
            .sort((a, b) => {
            const aDone = completedDeliveryStatuses.includes(a.status) ? 1 : 0;
            const bDone = completedDeliveryStatuses.includes(b.status) ? 1 : 0;
            if (aDone !== bDone)
                return aDone - bDone;
            return (a.assignment?.routeOrder ?? 9999) - (b.assignment?.routeOrder ?? 9999);
        })
            .slice(skip, skip + take);
        return {
            data,
            meta: (0, utils_1.buildPaginationMeta)(total, page, limit),
        };
    }
}
exports.DeliveryService = DeliveryService;
