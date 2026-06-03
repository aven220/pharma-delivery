import { prisma } from '../../../infra/database/prisma';
import { NotFoundError } from '../../../shared/errors/AppError';
import type { Prisma } from '@prisma/client';

export class CourierPanelService {
  async listCouriersForAssignment(filters: { search?: string; zone?: string }) {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      status: 'ACTIVE',
      role: { name: { in: ['DOMICILIARIO', 'COURIER'] } },
    };

    if (filters.zone?.trim()) {
      where.courierProfile = {
        is: {
          deletedAt: null,
          zone: { equals: filters.zone.trim(), mode: 'insensitive' },
        },
      };
    }

    if (filters.search?.trim()) {
      const parts = filters.search.trim().split(/\s+/).filter(Boolean);
      where.AND = parts.map((part) => ({
        OR: [
          { firstName: { contains: part, mode: 'insensitive' as const } },
          { lastName: { contains: part, mode: 'insensitive' as const } },
        ],
      }));
    }

    const couriers = await prisma.user.findMany({
      where,
      include: {
        courierProfile: true,
        role: { select: { name: true } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return Promise.all(
      couriers.map(async (c) => {
        const activeDeliveries = await prisma.assignment.count({
          where: {
            courierId: c.id,
            deletedAt: null,
            status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
          },
        });

        const routeDate = new Date();
        routeDate.setHours(0, 0, 0, 0);

        const [todayUrbanRoute, activeIntermunicipalRoutes] = await Promise.all([
          prisma.courierRoute.findUnique({
            where: { courierId_routeDate: { courierId: c.id, routeDate } },
            select: {
              id: true,
              status: true,
              routeDate: true,
              totalStops: true,
              pendingStops: true,
              completedStops: true,
            },
          }),
          prisma.intermunicipalRoute.findMany({
            where: {
              driverId: c.id,
              deletedAt: null,
              status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            select: {
              id: true,
              routeCode: true,
              routeDate: true,
              status: true,
              municipality: { select: { name: true } },
              _count: { select: { deliveries: { where: { deletedAt: null } } } },
            },
            orderBy: { routeDate: 'desc' },
            take: 3,
          }),
        ]);

        return {
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          documentId: c.documentId,
          status: c.status,
          operationalType: c.operationalType,
          zone: c.courierProfile?.zone,
          isAvailable: c.courierProfile?.isAvailable ?? false,
          activeDeliveries,
          lastConnectedAt: c.courierProfile?.lastConnectedAt,
          lastGpsAt: c.courierProfile?.lastGpsAt,
          currentLat: c.courierProfile?.currentLat,
          currentLng: c.courierProfile?.currentLng,
          todayUrbanRoute: todayUrbanRoute
            ? {
                id: todayUrbanRoute.id,
                routeDate: todayUrbanRoute.routeDate,
                status: todayUrbanRoute.status,
                totalStops: todayUrbanRoute.totalStops,
                pendingStops: todayUrbanRoute.pendingStops,
                completedStops: todayUrbanRoute.completedStops,
              }
            : null,
          activeIntermunicipalRoutes: activeIntermunicipalRoutes.map((r) => ({
            id: r.id,
            routeCode: r.routeCode,
            routeDate: r.routeDate,
            status: r.status,
            municipality: r.municipality.name,
            deliveryCount: r._count.deliveries,
          })),
        };
      })
    );
  }

  async getPanelOverview() {
    const couriers = await this.listCouriersForAssignment({});

    return Promise.all(
      couriers.map(async (c) => {
        const [completed, incidents] = await Promise.all([
          prisma.assignment.count({
            where: { courierId: c.id, status: 'COMPLETED', deletedAt: null },
          }),
          prisma.incident.count({
            where: { reportedById: c.id, deletedAt: null },
          }),
        ]);
        const total = completed + c.activeDeliveries;
        return {
          ...c,
          completedDeliveries: completed,
          incidents,
          effectiveness: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      })
    );
  }

  async getCourierDetail(courierId: string) {
    const user = await prisma.user.findFirst({
      where: { id: courierId, courierProfile: { isNot: null }, deletedAt: null },
      include: { courierProfile: true },
    });
    if (!user) throw new NotFoundError('Courier');

    const [activeAssignments, completedAssignments, incidents, gpsLogs] = await Promise.all([
      prisma.assignment.findMany({
        where: { courierId, deletedAt: null, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
        include: { delivery: { include: { patient: true } } },
      }),
      prisma.assignment.findMany({
        where: { courierId, deletedAt: null, status: 'COMPLETED' },
        take: 20,
        orderBy: { completedAt: 'desc' },
        include: { delivery: true },
      }),
      prisma.incident.findMany({
        where: { reportedById: courierId, deletedAt: null },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { delivery: true },
      }),
      prisma.gpsLog.findMany({
        where: { userId: courierId },
        take: 1,
        orderBy: { recordedAt: 'desc' },
      }),
    ]);

    return {
      courier: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        documentId: user.documentId,
        zone: user.courierProfile?.zone,
        isAvailable: user.courierProfile?.isAvailable,
        lastConnectedAt: user.courierProfile?.lastConnectedAt,
        lastGps: gpsLogs[0] || null,
      },
      activeAssignments,
      completedAssignments,
      incidents,
    };
  }

  async updateConnection(courierUserId: string) {
    await prisma.courier.update({
      where: { userId: courierUserId },
      data: { lastConnectedAt: new Date() },
    });
  }
}

export const courierPanelService = new CourierPanelService();
