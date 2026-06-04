export declare class CourierPanelService {
    listCouriersForAssignment(filters: {
        search?: string;
        zone?: string;
    }): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        documentId: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        zone: string | null | undefined;
        isAvailable: boolean;
        activeDeliveries: number;
        lastConnectedAt: Date | null | undefined;
        lastGpsAt: Date | null | undefined;
        currentLat: number | null | undefined;
        currentLng: number | null | undefined;
        todayUrbanRoute: {
            id: string;
            routeDate: Date;
            status: import(".prisma/client").$Enums.CourierRouteStatus;
            totalStops: number;
            pendingStops: number;
            completedStops: number;
        } | null;
        activeIntermunicipalRoutes: {
            id: string;
            routeCode: string;
            routeDate: Date;
            status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
            municipality: string;
            deliveryCount: number;
        }[];
    }[]>;
    getPanelOverview(): Promise<{
        completedDeliveries: number;
        incidents: number;
        effectiveness: number;
        id: string;
        firstName: string;
        lastName: string;
        documentId: string | null;
        status: import(".prisma/client").$Enums.UserStatus;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        zone: string | null | undefined;
        isAvailable: boolean;
        activeDeliveries: number;
        lastConnectedAt: Date | null | undefined;
        lastGpsAt: Date | null | undefined;
        currentLat: number | null | undefined;
        currentLng: number | null | undefined;
        todayUrbanRoute: {
            id: string;
            routeDate: Date;
            status: import(".prisma/client").$Enums.CourierRouteStatus;
            totalStops: number;
            pendingStops: number;
            completedStops: number;
        } | null;
        activeIntermunicipalRoutes: {
            id: string;
            routeCode: string;
            routeDate: Date;
            status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
            municipality: string;
            deliveryCount: number;
        }[];
    }[]>;
    getCourierDetail(courierId: string): Promise<{
        courier: {
            id: string;
            firstName: string;
            lastName: string;
            documentId: string | null;
            zone: string | null | undefined;
            isAvailable: boolean | undefined;
            lastConnectedAt: Date | null | undefined;
            lastGps: {
                id: string;
                createdAt: Date;
                userId: string;
                deliveryId: string | null;
                lat: number;
                lng: number;
                accuracy: number | null;
                altitude: number | null;
                speed: number | null;
                heading: number | null;
                deviceId: string | null;
                recordedAt: Date;
            };
        };
        activeAssignments: ({
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
        completedAssignments: ({
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
        incidents: ({
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
            type: import(".prisma/client").$Enums.IncidentType;
            status: import(".prisma/client").$Enums.IncidentStatus;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            deliveryId: string;
            reportedById: string;
            lat: number | null;
            lng: number | null;
            accuracy: number | null;
            resolvedAt: Date | null;
            resolution: string | null;
        })[];
    }>;
    updateConnection(courierUserId: string): Promise<void>;
}
export declare const courierPanelService: CourierPanelService;
