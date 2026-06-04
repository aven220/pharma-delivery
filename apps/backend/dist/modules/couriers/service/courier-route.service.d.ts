import { CourierRouteStatus, Prisma } from '@prisma/client';
export declare class CourierRouteService {
    getOrCreateTodayRoute(courierId: string, tx: Prisma.TransactionClient): Promise<{
        status: import(".prisma/client").$Enums.CourierRouteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courierId: string;
        notes: string | null;
        routeDate: Date;
        totalStops: number;
        completedStops: number;
        pendingStops: number;
        carriedFromId: string | null;
        notifiedAt: Date | null;
    }>;
    getNextRouteOrder(courierId: string, tx: Prisma.TransactionClient): Promise<number>;
    listRoutes(filters: {
        courierId?: string;
        dateFrom?: Date;
        dateTo?: Date;
        status?: CourierRouteStatus;
    }): Promise<({
        assignments: ({
            delivery: {
                status: import(".prisma/client").$Enums.DeliveryStatus;
                id: string;
                patient: {
                    firstName: string;
                    lastName: string;
                };
                deliveryNumber: string;
            };
        } & {
            status: import(".prisma/client").$Enums.AssignmentStatus;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deliveryId: string;
            courierId: string;
            routeId: string | null;
            intermunicipalRouteId: string | null;
            assignedById: string;
            routeOrder: number;
            assignedAt: Date;
            acceptedAt: Date | null;
            completedAt: Date | null;
            notes: string | null;
        })[];
        courier: {
            id: string;
            firstName: string;
            lastName: string;
            documentId: string | null;
        };
        carriedFrom: {
            id: string;
            routeDate: Date;
        } | null;
    } & {
        status: import(".prisma/client").$Enums.CourierRouteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courierId: string;
        notes: string | null;
        routeDate: Date;
        totalStops: number;
        completedStops: number;
        pendingStops: number;
        carriedFromId: string | null;
        notifiedAt: Date | null;
    })[]>;
    getTodayRoute(courierId: string): Promise<({
        assignments: ({
            delivery: {
                patient: {
                    id: string;
                    firstName: string;
                    lastName: string;
                    phone: string | null;
                    documentId: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    notes: string | null;
                    lat: number | null;
                    lng: number | null;
                    uniqueHash: string;
                    documentType: string;
                    phoneAlt: string | null;
                    phoneFamily: string | null;
                    phoneAlternative: string | null;
                    address: string;
                    addressDetail: string | null;
                    city: string | null;
                    neighborhood: string | null;
                };
            } & {
                status: import(".prisma/client").$Enums.DeliveryStatus;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                observations: string | null;
                patientId: string;
                municipalityId: string | null;
                priority: import(".prisma/client").$Enums.DeliveryPriority;
                deliveryNumber: string;
                documentNumber: string | null;
                scheduledDate: Date | null;
                scheduledTime: string | null;
                deliveredAt: Date | null;
                failedAt: Date | null;
                failureReason: string | null;
                uniqueHash: string;
                excelImportId: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.AssignmentStatus;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deliveryId: string;
            courierId: string;
            routeId: string | null;
            intermunicipalRouteId: string | null;
            assignedById: string;
            routeOrder: number;
            assignedAt: Date;
            acceptedAt: Date | null;
            completedAt: Date | null;
            notes: string | null;
        })[];
    } & {
        status: import(".prisma/client").$Enums.CourierRouteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courierId: string;
        notes: string | null;
        routeDate: Date;
        totalStops: number;
        completedStops: number;
        pendingStops: number;
        carriedFromId: string | null;
        notifiedAt: Date | null;
    }) | null>;
    refreshRouteStats(routeId: string, tx?: Prisma.TransactionClient): Promise<{
        status: import(".prisma/client").$Enums.CourierRouteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courierId: string;
        notes: string | null;
        routeDate: Date;
        totalStops: number;
        completedStops: number;
        pendingStops: number;
        carriedFromId: string | null;
        notifiedAt: Date | null;
    }>;
    carryOverPending(routeId: string, targetDateStr: string, userId: string): Promise<{
        previousRoute: {
            assignments: ({
                delivery: {
                    status: import(".prisma/client").$Enums.DeliveryStatus;
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    observations: string | null;
                    patientId: string;
                    municipalityId: string | null;
                    priority: import(".prisma/client").$Enums.DeliveryPriority;
                    deliveryNumber: string;
                    documentNumber: string | null;
                    scheduledDate: Date | null;
                    scheduledTime: string | null;
                    deliveredAt: Date | null;
                    failedAt: Date | null;
                    failureReason: string | null;
                    uniqueHash: string;
                    excelImportId: string | null;
                };
            } & {
                status: import(".prisma/client").$Enums.AssignmentStatus;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                deliveryId: string;
                courierId: string;
                routeId: string | null;
                intermunicipalRouteId: string | null;
                assignedById: string;
                routeOrder: number;
                assignedAt: Date;
                acceptedAt: Date | null;
                completedAt: Date | null;
                notes: string | null;
            })[];
        } & {
            status: import(".prisma/client").$Enums.CourierRouteStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            courierId: string;
            notes: string | null;
            routeDate: Date;
            totalStops: number;
            completedStops: number;
            pendingStops: number;
            carriedFromId: string | null;
            notifiedAt: Date | null;
        };
        nextRoute: {
            status: import(".prisma/client").$Enums.CourierRouteStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            courierId: string;
            notes: string | null;
            routeDate: Date;
            totalStops: number;
            completedStops: number;
            pendingStops: number;
            carriedFromId: string | null;
            notifiedAt: Date | null;
        };
        movedCount: number;
    }>;
    closeRoute(routeId: string, userId: string, notes?: string): Promise<{
        status: import(".prisma/client").$Enums.CourierRouteStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        courierId: string;
        notes: string | null;
        routeDate: Date;
        totalStops: number;
        completedStops: number;
        pendingStops: number;
        carriedFromId: string | null;
        notifiedAt: Date | null;
    }>;
}
export declare const courierRouteService: CourierRouteService;
