"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courierRouteService = exports.CourierRouteService = void 0;
const brand_1 = require("../../../config/brand");
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
function startOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}
class CourierRouteService {
    async getOrCreateTodayRoute(courierId, tx) {
        const routeDate = startOfDay();
        const existing = await tx.courierRoute.findUnique({
            where: { courierId_routeDate: { courierId, routeDate } },
        });
        if (existing)
            return existing;
        return tx.courierRoute.create({
            data: { courierId, routeDate, status: 'ACTIVE' },
        });
    }
    async getNextRouteOrder(courierId, tx) {
        const max = await tx.assignment.aggregate({
            where: {
                courierId,
                deletedAt: null,
                status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
            },
            _max: { routeOrder: true },
        });
        return (max._max.routeOrder ?? -1) + 1;
    }
    async listRoutes(filters) {
        const where = {
            ...(filters.courierId && { courierId: filters.courierId }),
            ...(filters.status && { status: filters.status }),
            ...(filters.dateFrom || filters.dateTo
                ? {
                    routeDate: {
                        ...(filters.dateFrom && { gte: filters.dateFrom }),
                        ...(filters.dateTo && { lte: filters.dateTo }),
                    },
                }
                : {}),
        };
        return prisma_1.prisma.courierRoute.findMany({
            where,
            orderBy: [{ routeDate: 'desc' }],
            include: {
                courier: { select: { id: true, firstName: true, lastName: true, documentId: true } },
                assignments: {
                    where: { deletedAt: null },
                    include: {
                        delivery: {
                            select: {
                                id: true,
                                deliveryNumber: true,
                                status: true,
                                patient: { select: { firstName: true, lastName: true } },
                            },
                        },
                    },
                    orderBy: { routeOrder: 'asc' },
                },
                carriedFrom: { select: { id: true, routeDate: true } },
            },
        });
    }
    async getTodayRoute(courierId) {
        const routeDate = startOfDay();
        return prisma_1.prisma.courierRoute.findUnique({
            where: { courierId_routeDate: { courierId, routeDate } },
            include: {
                assignments: {
                    where: { deletedAt: null, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
                    orderBy: { routeOrder: 'asc' },
                    include: { delivery: { include: { patient: true } } },
                },
            },
        });
    }
    async refreshRouteStats(routeId, tx = prisma_1.prisma) {
        const assignments = await tx.assignment.findMany({
            where: { routeId, deletedAt: null },
        });
        const completed = assignments.filter((a) => a.status === 'COMPLETED').length;
        const pending = assignments.filter((a) => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(a.status)).length;
        return tx.courierRoute.update({
            where: { id: routeId },
            data: {
                totalStops: assignments.length,
                completedStops: completed,
                pendingStops: pending,
                status: pending === 0 && assignments.length > 0 ? 'COMPLETED' : 'ACTIVE',
            },
        });
    }
    async carryOverPending(routeId, targetDateStr, userId) {
        const route = await prisma_1.prisma.courierRoute.findUnique({
            where: { id: routeId },
            include: {
                assignments: {
                    where: {
                        deletedAt: null,
                        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
                    },
                    include: { delivery: true },
                },
            },
        });
        if (!route)
            throw new AppError_1.NotFoundError('Courier route');
        if (route.assignments.length === 0) {
            throw new AppError_1.ValidationError('No hay entregas pendientes en esta ruta');
        }
        const targetDate = startOfDay(new Date(targetDateStr));
        return prisma_1.prisma.$transaction(async (tx) => {
            await tx.courierRoute.update({
                where: { id: routeId },
                data: { status: 'PENDING_NEXT_DAY', pendingStops: route.assignments.length },
            });
            let nextRoute = await tx.courierRoute.findUnique({
                where: { courierId_routeDate: { courierId: route.courierId, routeDate: targetDate } },
            });
            if (!nextRoute) {
                nextRoute = await tx.courierRoute.create({
                    data: {
                        courierId: route.courierId,
                        routeDate: targetDate,
                        status: 'ACTIVE',
                        carriedFromId: routeId,
                        notes: `Pendientes trasladados desde ${route.routeDate.toISOString().slice(0, 10)}`,
                    },
                });
            }
            let routeOrder = await this.getNextRouteOrder(route.courierId, tx);
            for (const assignment of route.assignments) {
                await tx.assignment.update({
                    where: { id: assignment.id },
                    data: { routeId: nextRoute.id, routeOrder: routeOrder++ },
                });
                await tx.delivery.update({
                    where: { id: assignment.deliveryId },
                    data: {
                        status: 'ASSIGNED',
                        scheduledDate: targetDate,
                    },
                });
            }
            const updatedNext = await tx.courierRoute.update({
                where: { id: nextRoute.id },
                data: {
                    totalStops: { increment: route.assignments.length },
                    pendingStops: { increment: route.assignments.length },
                    notifiedAt: new Date(),
                },
            });
            await tx.notification.create({
                data: {
                    userId: route.courierId,
                    type: 'SYSTEM',
                    title: `${brand_1.BrandConfig.notificationPrefix}: Ruta programada`,
                    body: `${route.assignments.length} entrega(s) pendiente(s) para ${targetDate.toLocaleDateString('es-CO')}`,
                    data: {
                        routeId: nextRoute.id,
                        routeDate: targetDate.toISOString(),
                        pendingCount: route.assignments.length,
                    },
                },
            });
            await tx.assignmentHistory.create({
                data: {
                    assignmentId: route.assignments[0].id,
                    courierId: route.courierId,
                    action: 'ROUTE_CARRY_OVER',
                    notes: `Trasladadas ${route.assignments.length} paradas al ${targetDate.toISOString().slice(0, 10)}`,
                    createdById: userId,
                },
            });
            return { previousRoute: route, nextRoute: updatedNext, movedCount: route.assignments.length };
        });
    }
    async closeRoute(routeId, userId, notes) {
        const route = await prisma_1.prisma.courierRoute.findUnique({ where: { id: routeId } });
        if (!route)
            throw new AppError_1.NotFoundError('Courier route');
        return prisma_1.prisma.courierRoute.update({
            where: { id: routeId },
            data: { status: 'CLOSED', notes: notes ?? route.notes },
        });
    }
}
exports.CourierRouteService = CourierRouteService;
exports.courierRouteService = new CourierRouteService();
