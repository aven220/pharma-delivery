import { IntermunicipalRouteStatus, Prisma } from '@prisma/client';
import type { Server } from 'socket.io';
declare const ROUTE_INCLUDE: {
    driver: {
        select: {
            id: true;
            firstName: true;
            lastName: true;
            email: true;
            operationalType: true;
        };
    };
    municipality: true;
    dispatchedBy: {
        select: {
            id: true;
            firstName: true;
            lastName: true;
        };
    };
    deliveries: {
        where: {
            deletedAt: null;
        };
        orderBy: {
            stopOrder: "asc";
        };
        include: {
            delivery: {
                include: {
                    patient: true;
                    items: {
                        where: {
                            deletedAt: null;
                        };
                        include: {
                            medication: true;
                        };
                    };
                };
            };
        };
    };
};
export declare class IntermunicipalRouteService {
    private io?;
    constructor(io?: Server | undefined);
    private validateRouteAssignee;
    private writeHistory;
    isDeliveryFieldResolved(status: string): boolean;
    computeStats(route: {
        deliveries: Array<{
            delivery: {
                id: string;
                patientId: string;
                status: string;
                items: Array<{
                    quantity: number;
                }>;
            };
        }>;
    }): {
        totalDeliveries: number;
        totalPatients: number;
        totalPackages: number;
        totalMedications: number;
        deliveredCount: number;
        pendingCount: number;
        failedCount: number;
    };
    mapRoute(route: Prisma.IntermunicipalRouteGetPayload<{
        include: typeof ROUTE_INCLUDE;
    }>): {
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    };
    list(filters: {
        page?: number;
        limit?: number;
        status?: IntermunicipalRouteStatus;
        municipalityId?: string;
        driverId?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        data: {
            id: string;
            routeCode: string;
            routeDate: Date;
            status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
            observations: string | null;
            dispatchedAt: Date | null;
            closedAt: Date | null;
            driver: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                operationalType: import(".prisma/client").$Enums.OperationalType;
            };
            municipality: {
                code: string | null;
                name: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
            };
            dispatchedBy: {
                id: string;
                firstName: string;
                lastName: string;
            } | null;
            stats: {
                totalDeliveries: number;
                totalPatients: number;
                totalPackages: number;
                totalMedications: number;
                deliveredCount: number;
                pendingCount: number;
                failedCount: number;
            };
            deliveries: {
                id: string;
                stopOrder: number;
                delivery: {
                    id: string;
                    deliveryNumber: string;
                    status: import(".prisma/client").$Enums.DeliveryStatus;
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
                    items: ({
                        medication: {
                            code: string;
                            status: import(".prisma/client").$Enums.MedicationStatus;
                            name: string;
                            id: string;
                            deletedAt: Date | null;
                            createdAt: Date;
                            updatedAt: Date;
                            description: string | null;
                            cum: string | null;
                            laboratory: string | null;
                            presentation: string | null;
                            concentration: string | null;
                            requiresColdChain: boolean;
                        };
                    } & {
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        deliveryId: string;
                        observations: string | null;
                        uniqueHash: string;
                        medicationId: string;
                        quantity: number;
                        lotNumber: string | null;
                        expiryDate: Date | null;
                        unitPrice: Prisma.Decimal | null;
                    })[];
                };
            }[];
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(id: string): Promise<{
        history: ({
            createdBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            routeId: string;
            notes: string | null;
            action: import(".prisma/client").$Enums.IntermunicipalRouteHistoryAction;
            fromStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
            toStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
            createdById: string;
            fromDriverId: string | null;
            toDriverId: string | null;
            metadata: Prisma.JsonValue | null;
        })[];
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    create(input: {
        routeCode: string;
        routeDate: string;
        driverId: string;
        municipalityId: string;
        observations?: string;
    }, userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    update(id: string, input: {
        routeCode?: string;
        routeDate?: string;
        driverId?: string;
        municipalityId?: string;
        observations?: string;
        status?: IntermunicipalRouteStatus;
    }, userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    addDeliveries(id: string, deliveryIds: string[], userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    removeDelivery(id: string, deliveryId: string, userId: string): Promise<{
        history: ({
            createdBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            routeId: string;
            notes: string | null;
            action: import(".prisma/client").$Enums.IntermunicipalRouteHistoryAction;
            fromStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
            toStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
            createdById: string;
            fromDriverId: string | null;
            toDriverId: string | null;
            metadata: Prisma.JsonValue | null;
        })[];
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    dispatch(id: string, userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    startRoute(id: string, userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    close(id: string, userId: string, notes?: string, options?: {
        requireAssignedDriver?: boolean;
    }): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    cancel(id: string, userId: string, notes?: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    private changeStatus;
    transferDriver(id: string, newDriverId: string, userId: string, notes?: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    splitRoute(id: string, input: {
        deliveryIds: string[];
        newRouteCode: string;
        newDriverId?: string;
    }, userId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }>;
    getHistory(id: string): Promise<({
        createdBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        routeId: string;
        notes: string | null;
        action: import(".prisma/client").$Enums.IntermunicipalRouteHistoryAction;
        fromStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
        toStatus: import(".prisma/client").$Enums.IntermunicipalRouteStatus | null;
        createdById: string;
        fromDriverId: string | null;
        toDriverId: string | null;
        metadata: Prisma.JsonValue | null;
    })[]>;
    listMyRoutes(driverId: string, status?: IntermunicipalRouteStatus): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        observations: string | null;
        dispatchedAt: Date | null;
        closedAt: Date | null;
        driver: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            operationalType: import(".prisma/client").$Enums.OperationalType;
        };
        municipality: {
            code: string | null;
            name: string;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
        };
        dispatchedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        stats: {
            totalDeliveries: number;
            totalPatients: number;
            totalPackages: number;
            totalMedications: number;
            deliveredCount: number;
            pendingCount: number;
            failedCount: number;
        };
        deliveries: {
            id: string;
            stopOrder: number;
            delivery: {
                id: string;
                deliveryNumber: string;
                status: import(".prisma/client").$Enums.DeliveryStatus;
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
                items: ({
                    medication: {
                        code: string;
                        status: import(".prisma/client").$Enums.MedicationStatus;
                        name: string;
                        id: string;
                        deletedAt: Date | null;
                        createdAt: Date;
                        updatedAt: Date;
                        description: string | null;
                        cum: string | null;
                        laboratory: string | null;
                        presentation: string | null;
                        concentration: string | null;
                        requiresColdChain: boolean;
                    };
                } & {
                    id: string;
                    deletedAt: Date | null;
                    createdAt: Date;
                    updatedAt: Date;
                    deliveryId: string;
                    observations: string | null;
                    uniqueHash: string;
                    medicationId: string;
                    quantity: number;
                    lotNumber: string | null;
                    expiryDate: Date | null;
                    unitPrice: Prisma.Decimal | null;
                })[];
            };
        }[];
    }[]>;
    getDashboard(): Promise<{
        byStatus: Record<string, number>;
        scheduled: number;
        dispatched: number;
        inRoute: number;
        completed: number;
        cancelled: number;
        byMunicipality: {
            municipality: {
                id: string;
                name: string;
            };
            total: number;
            delivered: number;
            pending: number;
            failed: number;
        }[];
    }>;
    listDrivers(): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        operationalType: import(".prisma/client").$Enums.OperationalType;
        role: {
            name: string;
        };
        courierProfile: {
            code: string;
            zone: string | null;
        } | null;
    }[]>;
    getDriverActiveRoutes(driverId: string): Promise<{
        id: string;
        routeCode: string;
        routeDate: Date;
        status: import(".prisma/client").$Enums.IntermunicipalRouteStatus;
        municipality: {
            name: string;
            id: string;
        };
        deliveryCount: number;
    }[]>;
}
export declare function createIntermunicipalRouteService(io?: Server): IntermunicipalRouteService;
export {};
