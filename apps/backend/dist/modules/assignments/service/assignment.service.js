"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentService = void 0;
exports.createAssignmentService = createAssignmentService;
const brand_1 = require("../../../config/brand");
const prisma_1 = require("../../../infra/database/prisma");
const AppError_1 = require("../../../shared/errors/AppError");
const delivery_status_service_1 = require("../../deliveries/service/delivery-status.service");
const courier_route_service_1 = require("../../couriers/service/courier-route.service");
const push_service_1 = require("../../notifications/push.service");
class AssignmentService {
    io;
    constructor(io) {
        this.io = io;
    }
    async createMultiple(deliveryIds, courierId, assignedById, notes) {
        const courier = await prisma_1.prisma.user.findFirst({
            where: { id: courierId, deletedAt: null },
            include: { courierProfile: true },
        });
        if (!courier?.courierProfile)
            throw new AppError_1.NotFoundError('Courier');
        const assignments = await prisma_1.prisma.$transaction(async (tx) => {
            const route = await courier_route_service_1.courierRouteService.getOrCreateTodayRoute(courierId, tx);
            let routeOrder = await courier_route_service_1.courierRouteService.getNextRouteOrder(courierId, tx);
            const results = [];
            for (const deliveryId of deliveryIds) {
                const delivery = await tx.delivery.findFirst({
                    where: { id: deliveryId, deletedAt: null },
                });
                if (!delivery)
                    throw new AppError_1.NotFoundError(`Delivery ${deliveryId}`);
                if (!delivery_status_service_1.deliveryStatusService.canAssignToCourier(delivery.status)) {
                    throw new AppError_1.ValidationError(`La entrega ${delivery.deliveryNumber} debe estar confirmada para entrega antes de asignar domiciliario`);
                }
                const existingSameCourier = await tx.assignment.findFirst({
                    where: {
                        deliveryId,
                        courierId,
                        deletedAt: null,
                        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
                    },
                    include: {
                        courier: { select: { id: true, firstName: true, lastName: true } },
                        delivery: {
                            select: {
                                id: true,
                                deliveryNumber: true,
                                status: true,
                                scheduledDate: true,
                                scheduledTime: true,
                                observations: true,
                                patient: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                        phoneAlt: true,
                                        address: true,
                                        city: true,
                                        neighborhood: true,
                                    },
                                },
                            },
                        },
                    },
                });
                if (existingSameCourier) {
                    results.push(existingSameCourier);
                    continue;
                }
                await tx.assignment.updateMany({
                    where: {
                        deliveryId,
                        deletedAt: null,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] },
                        courierId: { not: courierId },
                    },
                    data: { status: 'REASSIGNED', deletedAt: new Date() },
                });
                const assignment = await tx.assignment.create({
                    data: {
                        deliveryId,
                        courierId,
                        routeId: route.id,
                        assignedById,
                        routeOrder: routeOrder++,
                        notes,
                        status: 'PENDING',
                    },
                    include: {
                        courier: { select: { id: true, firstName: true, lastName: true } },
                        delivery: {
                            select: {
                                id: true,
                                deliveryNumber: true,
                                status: true,
                                scheduledDate: true,
                                scheduledTime: true,
                                observations: true,
                                patient: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                        phoneAlt: true,
                                        address: true,
                                        city: true,
                                        neighborhood: true,
                                    },
                                },
                            },
                        },
                    },
                });
                await tx.delivery.update({
                    where: { id: deliveryId },
                    data: { status: 'ASSIGNED' },
                });
                await tx.courierRoute.update({
                    where: { id: route.id },
                    data: { totalStops: { increment: 1 }, pendingStops: { increment: 1 } },
                });
                await tx.assignmentHistory.create({
                    data: {
                        assignmentId: assignment.id,
                        courierId,
                        action: 'CREATED',
                        toStatus: 'PENDING',
                        createdById: assignedById,
                    },
                });
                await tx.notification.create({
                    data: {
                        userId: courierId,
                        type: 'ASSIGNMENT',
                        title: `${brand_1.BrandConfig.notificationPrefix}: Nueva asignación`,
                        body: `Entrega ${assignment.delivery.deliveryNumber} asignada`,
                        data: { deliveryId, assignmentId: assignment.id },
                    },
                });
                results.push(assignment);
            }
            return results;
        });
        assignments.forEach((a) => {
            const payload = {
                id: a.id,
                deliveryId: a.deliveryId,
                status: a.status,
                routeOrder: a.routeOrder,
                courier: a.courier,
                delivery: a.delivery,
            };
            this.io?.to(`user:${courierId}`).emit('assignment.created', payload);
            this.io?.to('admin').emit('assignment.created', payload);
            void (0, push_service_1.sendExpoPush)({
                userId: courierId,
                title: `${brand_1.BrandConfig.notificationPrefix}: Nueva asignación`,
                body: `Entrega ${a.delivery.deliveryNumber} asignada`,
                data: { deliveryId: a.deliveryId, assignmentId: a.id },
            });
        });
        return assignments;
    }
    async reassign(assignmentId, newCourierId, assignedById, notes) {
        const existing = await prisma_1.prisma.assignment.findFirst({
            where: { id: assignmentId, deletedAt: null },
        });
        if (!existing)
            throw new AppError_1.NotFoundError('Assignment');
        await prisma_1.prisma.assignment.update({
            where: { id: assignmentId },
            data: { status: 'REASSIGNED', deletedAt: new Date() },
        });
        await prisma_1.prisma.assignmentHistory.create({
            data: {
                assignmentId,
                courierId: existing.courierId,
                action: 'REASSIGNED',
                fromStatus: existing.status,
                toStatus: 'REASSIGNED',
                notes,
                createdById: assignedById,
            },
        });
        const [newAssignment] = await this.createMultiple([existing.deliveryId], newCourierId, assignedById, notes);
        this.io?.to(`user:${newCourierId}`).emit('assignment.updated', {
            id: newAssignment.id,
            deliveryId: newAssignment.deliveryId,
            status: newAssignment.status,
            routeOrder: newAssignment.routeOrder,
            courier: newAssignment.courier,
            delivery: newAssignment.delivery,
        });
        this.io?.to('admin').emit('assignment.updated', newAssignment);
        return newAssignment;
    }
    async updateStatus(assignmentId, courierId, status) {
        const assignment = await prisma_1.prisma.assignment.findFirst({
            where: { id: assignmentId, courierId, deletedAt: null },
        });
        if (!assignment)
            throw new AppError_1.NotFoundError('Assignment');
        const updated = await prisma_1.prisma.assignment.update({
            where: { id: assignmentId },
            data: {
                status,
                acceptedAt: status === 'ACCEPTED' ? new Date() : assignment.acceptedAt,
                completedAt: status === 'COMPLETED' ? new Date() : assignment.completedAt,
            },
            include: { courier: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (status === 'IN_PROGRESS') {
            await prisma_1.prisma.delivery.update({
                where: { id: assignment.deliveryId },
                data: { status: 'IN_ROUTE' },
            });
        }
        this.io?.to(`user:${courierId}`).emit('assignment.updated', updated);
        this.io?.to('admin').emit('assignment.updated', updated);
        return updated;
    }
    async list(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const where = { deletedAt: null, ...(filters.courierId && { courierId: filters.courierId }), ...(filters.status && { status: filters.status }) };
        const [data, total] = await Promise.all([
            prisma_1.prisma.assignment.findMany({
                where,
                skip,
                take: limit,
                include: {
                    delivery: {
                        include: {
                            patient: true,
                            municipality: { select: { id: true, name: true } },
                        },
                    },
                    courier: { select: { id: true, firstName: true, lastName: true } },
                    assignedBy: { select: { id: true, firstName: true, lastName: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.assignment.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async withdraw(assignmentId, userId, notes) {
        const assignment = await prisma_1.prisma.assignment.findFirst({
            where: { id: assignmentId, deletedAt: null },
            include: { delivery: true, courier: { select: { id: true, firstName: true, lastName: true } } },
        });
        if (!assignment)
            throw new AppError_1.NotFoundError('Assignment');
        if (['COMPLETED', 'CANCELLED'].includes(assignment.status)) {
            throw new AppError_1.ValidationError('No se puede retirar una asignación completada o cancelada');
        }
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const cancelled = await tx.assignment.update({
                where: { id: assignmentId },
                data: { status: 'CANCELLED', deletedAt: new Date() },
            });
            await tx.assignmentHistory.create({
                data: {
                    assignmentId,
                    courierId: assignment.courierId,
                    action: 'WITHDRAWN',
                    fromStatus: assignment.status,
                    toStatus: 'CANCELLED',
                    notes,
                    createdById: userId,
                },
            });
            await tx.delivery.update({
                where: { id: assignment.deliveryId },
                data: { status: 'CONFIRMED_FOR_DELIVERY' },
            });
            await delivery_status_service_1.deliveryStatusService.logStatusChange(tx, {
                deliveryId: assignment.deliveryId,
                fromStatus: assignment.delivery.status,
                toStatus: 'CONFIRMED_FOR_DELIVERY',
                action: 'ASSIGNMENT_WITHDRAWN',
                changedById: userId,
                observations: notes,
            });
            return cancelled;
        });
        this.io?.to(`user:${assignment.courierId}`).emit('assignment.updated', {
            id: assignment.id,
            deliveryId: assignment.deliveryId,
            status: 'CANCELLED',
            withdrawn: true,
        });
        this.io?.to('admin').emit('assignment.updated', { ...updated, withdrawn: true });
        return updated;
    }
}
exports.AssignmentService = AssignmentService;
function createAssignmentService(io) {
    return new AssignmentService(io);
}
