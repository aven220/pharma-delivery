import type { AssignmentStatus } from '@prisma/client';
import type { Server } from 'socket.io';
export declare class AssignmentService {
    private io?;
    constructor(io?: Server | undefined);
    createMultiple(deliveryIds: string[], courierId: string, assignedById: string, notes?: string): Promise<({
        courier: {
            id: string;
            firstName: string;
            lastName: string;
        };
        delivery: {
            status: import(".prisma/client").$Enums.DeliveryStatus;
            id: string;
            observations: string | null;
            patient: {
                id: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                phoneAlt: string | null;
                address: string;
                city: string | null;
                neighborhood: string | null;
            };
            deliveryNumber: string;
            scheduledDate: Date | null;
            scheduledTime: string | null;
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
    })[]>;
    reassign(assignmentId: string, newCourierId: string, assignedById: string, notes?: string): Promise<{
        courier: {
            id: string;
            firstName: string;
            lastName: string;
        };
        delivery: {
            status: import(".prisma/client").$Enums.DeliveryStatus;
            id: string;
            observations: string | null;
            patient: {
                id: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                phoneAlt: string | null;
                address: string;
                city: string | null;
                neighborhood: string | null;
            };
            deliveryNumber: string;
            scheduledDate: Date | null;
            scheduledTime: string | null;
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
    }>;
    updateStatus(assignmentId: string, courierId: string, status: AssignmentStatus): Promise<{
        courier: {
            id: string;
            firstName: string;
            lastName: string;
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
    }>;
    list(filters: {
        courierId?: string;
        status?: AssignmentStatus;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            courier: {
                id: string;
                firstName: string;
                lastName: string;
            };
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
                municipality: {
                    name: string;
                    id: string;
                } | null;
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
            assignedBy: {
                id: string;
                firstName: string;
                lastName: string;
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
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    withdraw(assignmentId: string, userId: string, notes?: string): Promise<{
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
    }>;
}
export declare function createAssignmentService(io?: Server): AssignmentService;
