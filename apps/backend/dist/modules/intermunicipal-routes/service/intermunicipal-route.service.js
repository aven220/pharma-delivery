"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntermunicipalRouteService = void 0;
exports.createIntermunicipalRouteService = createIntermunicipalRouteService;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../../infra/database/prisma");
const utils_1 = require("@pharma/utils");
const AppError_1 = require("../../../shared/errors/AppError");
const delivery_status_service_1 = require("../../deliveries/service/delivery-status.service");
const ROUTE_INCLUDE = {
    driver: { select: { id: true, firstName: true, lastName: true, email: true, operationalType: true } },
    municipality: true,
    dispatchedBy: { select: { id: true, firstName: true, lastName: true } },
    deliveries: {
        where: { deletedAt: null },
        orderBy: { stopOrder: 'asc' },
        include: {
            delivery: {
                include: {
                    patient: true,
                    items: { where: { deletedAt: null }, include: { medication: true } },
                },
            },
        },
    },
};
const EDITABLE_STATUSES = [
    'PREPARATION',
    'READY_FOR_DISPATCH',
];
/** Estados de entrega registrados en campo; permiten cerrar la ruta. */
const FIELD_RESOLVED_DELIVERY_STATUSES = [
    'DELIVERED',
    'PARTIALLY_DELIVERED',
    'NOT_DELIVERED',
    'FAILED',
    'CANCELLED',
    'RETURNED',
];
const ROUTE_ASSIGNEE_FILTER = {
    deletedAt: null,
    status: client_1.UserStatus.ACTIVE,
    OR: [
        { operationalType: { in: [client_1.OperationalType.CONDUCTOR_RUTA, client_1.OperationalType.DOMICILIARIO] } },
        { courierProfile: { isNot: null } },
    ],
};
class IntermunicipalRouteService {
    io;
    constructor(io) {
        this.io = io;
    }
    async validateRouteAssignee(userId) {
        const user = await prisma_1.prisma.user.findFirst({
            where: { id: userId, ...ROUTE_ASSIGNEE_FILTER },
            select: { id: true, firstName: true, lastName: true, operationalType: true },
        });
        if (!user) {
            throw new AppError_1.ValidationError('Seleccione un responsable activo (domiciliario o conductor de ruta)');
        }
        return user;
    }
    async writeHistory(tx, input) {
        return tx.intermunicipalRouteHistory.create({
            data: {
                routeId: input.routeId,
                action: input.action,
                createdById: input.createdById,
                fromStatus: input.fromStatus ?? undefined,
                toStatus: input.toStatus ?? undefined,
                fromDriverId: input.fromDriverId ?? undefined,
                toDriverId: input.toDriverId ?? undefined,
                notes: input.notes,
                metadata: input.metadata,
            },
        });
    }
    isDeliveryFieldResolved(status) {
        return FIELD_RESOLVED_DELIVERY_STATUSES.includes(status);
    }
    computeStats(route) {
        const deliveries = route.deliveries.map((d) => d.delivery);
        const patientIds = new Set(deliveries.map((d) => d.patientId));
        const delivered = deliveries.filter((d) => ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(d.status)).length;
        const failed = deliveries.filter((d) => ['NOT_DELIVERED', 'FAILED', 'CANCELLED'].includes(d.status)).length;
        const pending = deliveries.length - delivered - failed;
        const totalMedications = deliveries.reduce((sum, d) => sum + d.items.reduce((s, i) => s + i.quantity, 0), 0);
        return {
            totalDeliveries: deliveries.length,
            totalPatients: patientIds.size,
            totalPackages: deliveries.length,
            totalMedications,
            deliveredCount: delivered,
            pendingCount: pending,
            failedCount: failed,
        };
    }
    mapRoute(route) {
        const stats = this.computeStats(route);
        return {
            id: route.id,
            routeCode: route.routeCode,
            routeDate: route.routeDate,
            status: route.status,
            observations: route.observations,
            dispatchedAt: route.dispatchedAt,
            closedAt: route.closedAt,
            driver: route.driver,
            municipality: route.municipality,
            dispatchedBy: route.dispatchedBy,
            stats,
            deliveries: route.deliveries.map((rd) => ({
                id: rd.id,
                stopOrder: rd.stopOrder,
                delivery: {
                    id: rd.delivery.id,
                    deliveryNumber: rd.delivery.deliveryNumber,
                    status: rd.delivery.status,
                    patient: rd.delivery.patient,
                    items: rd.delivery.items,
                },
            })),
        };
    }
    async list(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const { skip, take } = (0, utils_1.paginate)(page, limit);
        const where = {
            deletedAt: null,
            ...(filters.status && { status: filters.status }),
            ...(filters.municipalityId && { municipalityId: filters.municipalityId }),
            ...(filters.driverId && { driverId: filters.driverId }),
            ...(filters.dateFrom || filters.dateTo
                ? {
                    routeDate: {
                        ...(filters.dateFrom && { gte: new Date(filters.dateFrom) }),
                        ...(filters.dateTo && { lte: new Date(filters.dateTo) }),
                    },
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            prisma_1.prisma.intermunicipalRoute.findMany({
                where,
                skip,
                take,
                orderBy: [{ routeDate: 'desc' }, { createdAt: 'desc' }],
                include: ROUTE_INCLUDE,
            }),
            prisma_1.prisma.intermunicipalRoute.count({ where }),
        ]);
        return {
            data: rows.map((r) => this.mapRoute(r)),
            meta: (0, utils_1.buildPaginationMeta)(total, page, limit),
        };
    }
    async getById(id) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { id, deletedAt: null },
            include: {
                ...ROUTE_INCLUDE,
                history: {
                    orderBy: { createdAt: 'desc' },
                    take: 50,
                    include: { createdBy: { select: { firstName: true, lastName: true } } },
                },
            },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        return { ...this.mapRoute(route), history: route.history };
    }
    async create(input, userId) {
        await this.validateRouteAssignee(input.driverId);
        const municipality = await prisma_1.prisma.routeMunicipality.findFirst({
            where: { id: input.municipalityId, deletedAt: null, isActive: true },
        });
        if (!municipality)
            throw new AppError_1.NotFoundError('Municipality');
        const dup = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { routeCode: input.routeCode, deletedAt: null },
        });
        if (dup)
            throw new AppError_1.ConflictError(`Ya existe la ruta ${input.routeCode}`);
        return prisma_1.prisma.$transaction(async (tx) => {
            const route = await tx.intermunicipalRoute.create({
                data: {
                    routeCode: input.routeCode,
                    routeDate: new Date(input.routeDate),
                    driverId: input.driverId,
                    municipalityId: input.municipalityId,
                    observations: input.observations,
                    status: 'PREPARATION',
                },
                include: ROUTE_INCLUDE,
            });
            await this.writeHistory(tx, {
                routeId: route.id,
                action: 'CREATED',
                createdById: userId,
                toStatus: 'PREPARATION',
            });
            return this.mapRoute(route);
        });
    }
    async update(id, input, userId) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({ where: { id, deletedAt: null } });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (!EDITABLE_STATUSES.includes(route.status) && input.status !== 'READY_FOR_DISPATCH') {
            if (input.routeCode || input.routeDate || input.driverId || input.municipalityId) {
                throw new AppError_1.ValidationError('Solo se puede editar una ruta en preparación o lista para despacho');
            }
        }
        if (input.driverId) {
            await this.validateRouteAssignee(input.driverId);
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            const updated = await tx.intermunicipalRoute.update({
                where: { id },
                data: {
                    ...(input.routeCode && { routeCode: input.routeCode }),
                    ...(input.routeDate && { routeDate: new Date(input.routeDate) }),
                    ...(input.driverId && { driverId: input.driverId }),
                    ...(input.municipalityId && { municipalityId: input.municipalityId }),
                    ...(input.observations !== undefined && { observations: input.observations }),
                    ...(input.status && { status: input.status }),
                },
                include: ROUTE_INCLUDE,
            });
            await this.writeHistory(tx, {
                routeId: id,
                action: input.status && input.status !== route.status ? 'STATUS_CHANGED' : 'UPDATED',
                createdById: userId,
                fromStatus: route.status,
                toStatus: updated.status,
                fromDriverId: route.driverId !== updated.driverId ? route.driverId : undefined,
                toDriverId: route.driverId !== updated.driverId ? updated.driverId : undefined,
            });
            return this.mapRoute(updated);
        });
    }
    async addDeliveries(id, deliveryIds, userId) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { id, deletedAt: null },
            include: { deliveries: { where: { deletedAt: null } } },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (!['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status)) {
            throw new AppError_1.ValidationError('Solo se pueden agregar entregas a rutas en preparación');
        }
        return prisma_1.prisma.$transaction(async (tx) => {
            let stopOrder = route.deliveries.reduce((max, d) => Math.max(max, d.stopOrder), -1) + 1;
            for (const deliveryId of deliveryIds) {
                const delivery = await tx.delivery.findFirst({ where: { id: deliveryId, deletedAt: null } });
                if (!delivery)
                    throw new AppError_1.NotFoundError(`Delivery ${deliveryId}`);
                if (!delivery_status_service_1.deliveryStatusService.canAssignToCourier(delivery.status)) {
                    throw new AppError_1.ValidationError(`La entrega ${delivery.deliveryNumber} debe estar confirmada para agregar a la ruta`);
                }
                const onOtherRoute = await tx.intermunicipalRouteDelivery.findFirst({
                    where: {
                        deliveryId,
                        deletedAt: null,
                        route: { deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] }, id: { not: id } },
                    },
                });
                if (onOtherRoute) {
                    throw new AppError_1.ValidationError(`La entrega ${delivery.deliveryNumber} ya está en otra ruta activa`);
                }
                await tx.intermunicipalRouteDelivery.upsert({
                    where: { routeId_deliveryId: { routeId: id, deliveryId } },
                    create: { routeId: id, deliveryId, stopOrder: stopOrder++, addedById: userId },
                    update: { deletedAt: null, stopOrder: stopOrder++ },
                });
                await tx.delivery.update({
                    where: { id: deliveryId },
                    data: { municipalityId: route.municipalityId },
                });
            }
            await this.writeHistory(tx, {
                routeId: id,
                action: 'DELIVERY_ADDED',
                createdById: userId,
                metadata: { deliveryIds, count: deliveryIds.length },
            });
            const full = await tx.intermunicipalRoute.findUniqueOrThrow({
                where: { id },
                include: ROUTE_INCLUDE,
            });
            return this.mapRoute(full);
        });
    }
    async removeDelivery(id, deliveryId, userId) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({ where: { id, deletedAt: null } });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (!EDITABLE_STATUSES.includes(route.status)) {
            throw new AppError_1.ValidationError('No se pueden quitar entregas de una ruta despachada');
        }
        await prisma_1.prisma.intermunicipalRouteDelivery.updateMany({
            where: { routeId: id, deliveryId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
        await prisma_1.prisma.intermunicipalRouteHistory.create({
            data: {
                routeId: id,
                action: 'DELIVERY_REMOVED',
                createdById: userId,
                metadata: { deliveryId },
            },
        });
        return this.getById(id);
    }
    async dispatch(id, userId) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { id, deletedAt: null },
            include: {
                deliveries: {
                    where: { deletedAt: null },
                    orderBy: { stopOrder: 'asc' },
                    include: { delivery: true },
                },
            },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (!['PREPARATION', 'READY_FOR_DISPATCH'].includes(route.status)) {
            throw new AppError_1.ValidationError('La ruta no está lista para despacho');
        }
        if (route.deliveries.length === 0) {
            throw new AppError_1.ValidationError('La ruta no tiene entregas asignadas');
        }
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            let routeOrder = 0;
            for (const rd of route.deliveries) {
                await tx.assignment.updateMany({
                    where: {
                        deliveryId: rd.deliveryId,
                        deletedAt: null,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                    },
                    data: { status: 'REASSIGNED', deletedAt: new Date() },
                });
                await tx.assignment.create({
                    data: {
                        deliveryId: rd.deliveryId,
                        courierId: route.driverId,
                        intermunicipalRouteId: route.id,
                        assignedById: userId,
                        routeOrder: routeOrder++,
                        status: 'PENDING',
                    },
                });
                await delivery_status_service_1.deliveryStatusService.logStatusChange(tx, {
                    deliveryId: rd.deliveryId,
                    fromStatus: rd.delivery.status,
                    toStatus: 'ASSIGNED',
                    action: 'INTERMUNICIPAL_ROUTE_DISPATCH',
                    changedById: userId,
                    observations: `Despacho ruta ${route.routeCode}`,
                });
                await tx.delivery.update({
                    where: { id: rd.deliveryId },
                    data: { status: 'ASSIGNED' },
                });
            }
            const updated = await tx.intermunicipalRoute.update({
                where: { id },
                data: {
                    status: 'DISPATCHED',
                    dispatchedAt: new Date(),
                    dispatchedById: userId,
                },
                include: ROUTE_INCLUDE,
            });
            await this.writeHistory(tx, {
                routeId: id,
                action: 'DISPATCHED',
                createdById: userId,
                fromStatus: route.status,
                toStatus: 'DISPATCHED',
                notes: `Despachada con ${route.deliveries.length} entrega(s)`,
            });
            return this.mapRoute(updated);
        });
        this.io?.to(`user:${route.driverId}`).emit('route.dispatched', result);
        this.io?.to(`user:${route.driverId}`).emit('assignment.created', { routeId: id });
        return result;
    }
    async startRoute(id, userId) {
        return this.changeStatus(id, 'IN_ROUTE', 'STATUS_CHANGED', userId);
    }
    async close(id, userId, notes, options) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { id, deletedAt: null },
            include: {
                deliveries: {
                    where: { deletedAt: null },
                    include: {
                        delivery: { select: { id: true, deliveryNumber: true, status: true } },
                    },
                },
            },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (['COMPLETED', 'CANCELLED'].includes(route.status)) {
            throw new AppError_1.ValidationError('La ruta ya está finalizada');
        }
        if (options?.requireAssignedDriver && route.driverId !== userId) {
            throw new AppError_1.ValidationError('Solo el encargado asignado a la ruta puede finalizarla');
        }
        if (route.deliveries.length === 0) {
            throw new AppError_1.ValidationError('La ruta no tiene entregas para finalizar');
        }
        const unresolved = route.deliveries.filter((rd) => !this.isDeliveryFieldResolved(rd.delivery.status));
        if (unresolved.length > 0) {
            const numbers = unresolved
                .map((rd) => rd.delivery.deliveryNumber)
                .slice(0, 5)
                .join(', ');
            const suffix = unresolved.length > 5 ? ` y ${unresolved.length - 5} más` : '';
            throw new AppError_1.ValidationError(`Debe registrar el estado de todas las entregas antes de finalizar. Pendientes: ${numbers}${suffix}`);
        }
        return this.changeStatus(id, 'COMPLETED', 'CLOSED', userId, notes);
    }
    async cancel(id, userId, notes) {
        return this.changeStatus(id, 'CANCELLED', 'CANCELLED', userId, notes);
    }
    async changeStatus(id, toStatus, action, userId, notes) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({ where: { id, deletedAt: null } });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const row = await tx.intermunicipalRoute.update({
                where: { id },
                data: {
                    status: toStatus,
                    ...(toStatus === 'COMPLETED' && { closedAt: new Date() }),
                },
                include: ROUTE_INCLUDE,
            });
            await this.writeHistory(tx, {
                routeId: id,
                action,
                createdById: userId,
                fromStatus: route.status,
                toStatus,
                notes,
            });
            return row;
        });
        return this.mapRoute(updated);
    }
    async transferDriver(id, newDriverId, userId, notes) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({ where: { id, deletedAt: null } });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        const driver = await prisma_1.prisma.user.findFirst({
            where: { id: newDriverId, deletedAt: null, operationalType: 'CONDUCTOR_RUTA' },
        });
        if (!driver)
            throw new AppError_1.ValidationError('El nuevo conductor debe ser CONDUCTOR_RUTA');
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            await tx.assignment.updateMany({
                where: { intermunicipalRouteId: id, deletedAt: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                data: { courierId: newDriverId },
            });
            const row = await tx.intermunicipalRoute.update({
                where: { id },
                data: { driverId: newDriverId },
                include: ROUTE_INCLUDE,
            });
            await this.writeHistory(tx, {
                routeId: id,
                action: 'DRIVER_CHANGED',
                createdById: userId,
                fromDriverId: route.driverId,
                toDriverId: newDriverId,
                notes,
            });
            return row;
        });
        const mapped = this.mapRoute(updated);
        this.io?.to(`user:${newDriverId}`).emit('route.transferred', mapped);
        return mapped;
    }
    async splitRoute(id, input, userId) {
        const route = await prisma_1.prisma.intermunicipalRoute.findFirst({
            where: { id, deletedAt: null },
            include: { deliveries: { where: { deletedAt: null } } },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Route');
        if (input.deliveryIds.length === 0) {
            throw new AppError_1.ValidationError('Seleccione entregas para dividir la ruta');
        }
        const newDriverId = input.newDriverId || route.driverId;
        return prisma_1.prisma.$transaction(async (tx) => {
            const newRoute = await tx.intermunicipalRoute.create({
                data: {
                    routeCode: input.newRouteCode,
                    routeDate: route.routeDate,
                    driverId: newDriverId,
                    municipalityId: route.municipalityId,
                    observations: `Dividida desde ${route.routeCode}`,
                    status: route.status,
                    parentRouteId: route.id,
                    ...(route.dispatchedAt && {
                        dispatchedAt: route.dispatchedAt,
                        dispatchedById: route.dispatchedById,
                    }),
                },
            });
            let stopOrder = 0;
            for (const deliveryId of input.deliveryIds) {
                await tx.intermunicipalRouteDelivery.updateMany({
                    where: { routeId: id, deliveryId, deletedAt: null },
                    data: { deletedAt: new Date() },
                });
                await tx.intermunicipalRouteDelivery.create({
                    data: { routeId: newRoute.id, deliveryId, stopOrder: stopOrder++, addedById: userId },
                });
                await tx.assignment.updateMany({
                    where: { intermunicipalRouteId: id, deliveryId, deletedAt: null },
                    data: { intermunicipalRouteId: newRoute.id, courierId: newDriverId },
                });
            }
            await this.writeHistory(tx, {
                routeId: id,
                action: 'SPLIT',
                createdById: userId,
                metadata: { newRouteId: newRoute.id, deliveryIds: input.deliveryIds },
            });
            await this.writeHistory(tx, {
                routeId: newRoute.id,
                action: 'CREATED',
                createdById: userId,
                toStatus: newRoute.status,
                notes: `Dividida desde ${route.routeCode}`,
            });
            const full = await tx.intermunicipalRoute.findUniqueOrThrow({
                where: { id: newRoute.id },
                include: ROUTE_INCLUDE,
            });
            return this.mapRoute(full);
        });
    }
    async getHistory(id) {
        return prisma_1.prisma.intermunicipalRouteHistory.findMany({
            where: { routeId: id },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { firstName: true, lastName: true } } },
        });
    }
    async listMyRoutes(driverId, status) {
        const where = {
            driverId,
            deletedAt: null,
            ...(status
                ? { status }
                : { status: { in: ['DISPATCHED', 'IN_ROUTE', 'COMPLETED', 'PREPARATION', 'READY_FOR_DISPATCH'] } }),
        };
        const rows = await prisma_1.prisma.intermunicipalRoute.findMany({
            where,
            orderBy: [{ routeDate: 'desc' }, { createdAt: 'desc' }],
            include: ROUTE_INCLUDE,
        });
        return rows.map((r) => this.mapRoute(r));
    }
    async getDashboard() {
        const routes = await prisma_1.prisma.intermunicipalRoute.findMany({
            where: { deletedAt: null },
            include: ROUTE_INCLUDE,
        });
        const byStatus = routes.reduce((acc, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
        }, {});
        const municipalityMap = new Map();
        for (const route of routes) {
            const stats = this.computeStats(route);
            const key = route.municipalityId;
            const current = municipalityMap.get(key) || {
                municipality: { id: route.municipality.id, name: route.municipality.name },
                total: 0,
                delivered: 0,
                pending: 0,
                failed: 0,
            };
            current.total += stats.totalDeliveries;
            current.delivered += stats.deliveredCount;
            current.pending += stats.pendingCount;
            current.failed += stats.failedCount;
            municipalityMap.set(key, current);
        }
        return {
            byStatus,
            scheduled: (byStatus.PREPARATION || 0) + (byStatus.READY_FOR_DISPATCH || 0),
            dispatched: byStatus.DISPATCHED || 0,
            inRoute: byStatus.IN_ROUTE || 0,
            completed: byStatus.COMPLETED || 0,
            cancelled: byStatus.CANCELLED || 0,
            byMunicipality: Array.from(municipalityMap.values()),
        };
    }
    async listDrivers() {
        return prisma_1.prisma.user.findMany({
            where: ROUTE_ASSIGNEE_FILTER,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                operationalType: true,
                role: { select: { name: true } },
                courierProfile: { select: { code: true, zone: true } },
            },
            orderBy: [{ firstName: 'asc' }],
        });
    }
    async getDriverActiveRoutes(driverId) {
        const routes = await prisma_1.prisma.intermunicipalRoute.findMany({
            where: {
                driverId,
                deletedAt: null,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            include: {
                municipality: { select: { id: true, name: true } },
                deliveries: { where: { deletedAt: null } },
            },
            orderBy: [{ routeDate: 'desc' }, { createdAt: 'desc' }],
        });
        return routes.map((route) => ({
            id: route.id,
            routeCode: route.routeCode,
            routeDate: route.routeDate,
            status: route.status,
            municipality: route.municipality,
            deliveryCount: route.deliveries.length,
        }));
    }
}
exports.IntermunicipalRouteService = IntermunicipalRouteService;
function createIntermunicipalRouteService(io) {
    return new IntermunicipalRouteService(io);
}
