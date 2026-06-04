"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = exports.DashboardService = void 0;
const prisma_1 = require("../../../infra/database/prisma");
const call_service_1 = require("../../calls/service/call.service");
const call_assignment_service_1 = require("../../calls/service/call-assignment.service");
class DashboardService {
    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        const pendingCallStatuses = ['PENDING_CALL', 'PENDING', 'CALL_COMPLETED', 'RESCHEDULED'];
        const [pendingCall, callCompleted, confirmed, assigned, inRoute, delivered, failed, incidents, deactivated, pendingPatients, activeCouriers, callStats, callMgmtStats,] = await Promise.all([
            prisma_1.prisma.delivery.count({ where: { status: { in: [...pendingCallStatuses] }, deletedAt: null } }),
            prisma_1.prisma.delivery.count({ where: { status: 'CALL_COMPLETED', deletedAt: null } }),
            prisma_1.prisma.delivery.count({ where: { status: 'CONFIRMED_FOR_DELIVERY', deletedAt: null } }),
            prisma_1.prisma.delivery.count({ where: { status: 'ASSIGNED', deletedAt: null } }),
            prisma_1.prisma.delivery.count({ where: { status: 'IN_ROUTE', deletedAt: null } }),
            prisma_1.prisma.delivery.count({ where: { status: 'DELIVERED', deletedAt: null } }),
            prisma_1.prisma.delivery.count({
                where: { status: { in: ['FAILED', 'NOT_DELIVERED'] }, deletedAt: null },
            }),
            prisma_1.prisma.incident.count({ where: { deletedAt: null, createdAt: { gte: today } } }),
            prisma_1.prisma.delivery.count({ where: { status: 'CANCELLED', deletedAt: null } }),
            prisma_1.prisma.delivery.count({
                where: {
                    deletedAt: null,
                    status: { in: [...pendingCallStatuses] },
                },
            }),
            prisma_1.prisma.courier.count({ where: { isAvailable: true, deletedAt: null } }),
            call_service_1.callService.getEffectivenessStats(today),
            call_assignment_service_1.callAssignmentService.getManagementStats(today),
        ]);
        const courierStats = await prisma_1.prisma.assignment.groupBy({
            by: ['courierId'],
            where: { createdAt: { gte: monthAgo }, deletedAt: null },
            _count: true,
        });
        const courierPerformance = await Promise.all(courierStats.map(async (cs) => {
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: cs.courierId },
                select: { firstName: true, lastName: true },
            });
            const completed = await prisma_1.prisma.assignment.count({
                where: { courierId: cs.courierId, status: 'COMPLETED', createdAt: { gte: monthAgo } },
            });
            const failedCount = await prisma_1.prisma.delivery.count({
                where: {
                    status: { in: ['FAILED', 'NOT_DELIVERED'] },
                    assignments: { some: { courierId: cs.courierId } },
                },
            });
            return {
                courierId: cs.courierId,
                name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
                totalDeliveries: cs._count,
                completed,
                failed: failedCount,
                completionRate: cs._count > 0 ? Math.round((completed / cs._count) * 100) : 0,
            };
        }));
        const dailyDeliveries = await prisma_1.prisma.delivery.findMany({
            where: { deliveredAt: { gte: weekAgo }, deletedAt: null },
            select: { deliveredAt: true, status: true },
        });
        const dailyStats = this.groupByDay(dailyDeliveries, 7);
        const weeklyStats = this.groupByWeek(dailyDeliveries, 4);
        const monthlyStats = await this.getMonthlyStats(monthAgo);
        return {
            pending: pendingCall,
            delivered,
            inRoute,
            failed,
            activeCouriers,
            callsToday: callStats.total,
            callEffectiveness: callStats.effectiveness,
            operatorPerformance: callStats.operators,
            courierPerformance,
            dailyStats,
            weeklyStats,
            monthlyStats,
            pendingPatients,
            callManagementStats: callMgmtStats,
            operational: {
                pendingCall,
                callCompleted,
                confirmed,
                assigned,
                inRoute,
                delivered,
                failed,
                incidents,
                deactivated,
                pendingPatients,
            },
        };
    }
    groupByDay(deliveries, days) {
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            const dayDeliveries = deliveries.filter((d) => d.deliveredAt && d.deliveredAt >= date && d.deliveredAt < nextDay);
            result.push({
                label: date.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
                value: dayDeliveries.length,
                delivered: dayDeliveries.filter((d) => d.status === 'DELIVERED').length,
                failed: dayDeliveries.filter((d) => ['FAILED', 'NOT_DELIVERED'].includes(d.status)).length,
            });
        }
        return result;
    }
    groupByWeek(deliveries, weeks) {
        const result = [];
        for (let i = weeks - 1; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
            const weekEnd = new Date();
            weekEnd.setDate(weekEnd.getDate() - i * 7);
            const count = deliveries.filter((d) => d.deliveredAt && d.deliveredAt >= weekStart && d.deliveredAt < weekEnd).length;
            result.push({ label: `Sem ${weeks - i}`, value: count });
        }
        return result;
    }
    async getMonthlyStats(since) {
        const deliveries = await prisma_1.prisma.delivery.findMany({
            where: { createdAt: { gte: since }, deletedAt: null },
            select: { createdAt: true, status: true },
        });
        const months = new Map();
        deliveries.forEach((d) => {
            const key = d.createdAt.toLocaleDateString('es-CO', { month: 'short' });
            months.set(key, (months.get(key) || 0) + 1);
        });
        return Array.from(months.entries()).map(([label, value]) => ({ label, value }));
    }
}
exports.DashboardService = DashboardService;
exports.dashboardService = new DashboardService();
