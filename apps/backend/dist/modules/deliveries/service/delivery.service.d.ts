import { DeliveryStatus, Prisma } from '@prisma/client';
export declare class DeliveryRepository {
    findMany(filters: {
        page: number;
        limit: number;
        status?: DeliveryStatus;
        priority?: string;
        courierId?: string;
        driverId?: string;
        assignedById?: string;
        municipalityId?: string;
        search?: string;
        dateFrom?: string;
        dateTo?: string;
    }): Promise<{
        data: ({
            assignments: ({
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
            })[];
            evidence: {
                type: import(".prisma/client").$Enums.EvidenceType;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                deliveryId: string;
                lat: number | null;
                lng: number | null;
                incidentId: string | null;
                uploadedById: string;
                filePath: string;
                fileName: string;
                mimeType: string;
                fileSize: number;
            }[];
            gpsLogs: {
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
            }[];
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<({
        assignments: ({
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
        })[];
        evidence: {
            type: import(".prisma/client").$Enums.EvidenceType;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            deliveryId: string;
            lat: number | null;
            lng: number | null;
            incidentId: string | null;
            uploadedById: string;
            filePath: string;
            fileName: string;
            mimeType: string;
            fileSize: number;
        }[];
        gpsLogs: {
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
        }[];
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
    }) | null>;
    updateStatus(id: string, data: Prisma.DeliveryUpdateInput): Promise<{
        assignments: ({
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
        })[];
        evidence: {
            type: import(".prisma/client").$Enums.EvidenceType;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            deliveryId: string;
            lat: number | null;
            lng: number | null;
            incidentId: string | null;
            uploadedById: string;
            filePath: string;
            fileName: string;
            mimeType: string;
            fileSize: number;
        }[];
        gpsLogs: {
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
        }[];
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
    }>;
    createGpsLog(data: {
        userId: string;
        deliveryId: string;
        lat: number;
        lng: number;
        accuracy?: number;
    }): Promise<{
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
    }>;
    countByStatus(): Promise<Record<string, number>>;
}
export declare class DeliveryService {
    private repo;
    constructor(repo?: DeliveryRepository);
    mapDelivery(d: NonNullable<Awaited<ReturnType<DeliveryRepository['findById']>>>, assignmentOverride?: {
        id: string;
        status: string;
        routeOrder: number;
        courier: {
            id: string;
            firstName: string;
            lastName: string;
        };
    }): {
        id: string;
        deliveryNumber: string;
        status: import(".prisma/client").$Enums.DeliveryStatus;
        priority: import(".prisma/client").$Enums.DeliveryPriority;
        scheduledDate: string | null;
        scheduledTime: string | null;
        observations: string | null;
        failureReason: string | null;
        patient: {
            id: string;
            documentId: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            address: string;
            lat: number | null;
            lng: number | null;
        };
        items: {
            id: string;
            quantity: number;
            lotNumber: string | null;
            medication: {
                id: string;
                code: string;
                name: string;
            };
        }[];
        assignment: {
            id: string;
            status: string;
            routeOrder: number;
            courier: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } | null;
        evidenceCount: number;
    };
    list(filters: Parameters<DeliveryRepository['findMany']>[0]): Promise<{
        data: {
            id: string;
            deliveryNumber: string;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            priority: import(".prisma/client").$Enums.DeliveryPriority;
            scheduledDate: string | null;
            scheduledTime: string | null;
            observations: string | null;
            failureReason: string | null;
            patient: {
                id: string;
                documentId: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                address: string;
                lat: number | null;
                lng: number | null;
            };
            items: {
                id: string;
                quantity: number;
                lotNumber: string | null;
                medication: {
                    id: string;
                    code: string;
                    name: string;
                };
            }[];
            assignment: {
                id: string;
                status: string;
                routeOrder: number;
                courier: {
                    id: string;
                    firstName: string;
                    lastName: string;
                };
            } | null;
            evidenceCount: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(id: string): Promise<{
        id: string;
        deliveryNumber: string;
        status: import(".prisma/client").$Enums.DeliveryStatus;
        priority: import(".prisma/client").$Enums.DeliveryPriority;
        scheduledDate: string | null;
        scheduledTime: string | null;
        observations: string | null;
        failureReason: string | null;
        patient: {
            id: string;
            documentId: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            address: string;
            lat: number | null;
            lng: number | null;
        };
        items: {
            id: string;
            quantity: number;
            lotNumber: string | null;
            medication: {
                id: string;
                code: string;
                name: string;
            };
        }[];
        assignment: {
            id: string;
            status: string;
            routeOrder: number;
            courier: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } | null;
        evidenceCount: number;
    }>;
    updateStatus(id: string, userId: string, input: {
        status: DeliveryStatus;
        lat?: number;
        lng?: number;
        accuracy?: number;
        failureReason?: string;
        observations?: string;
    }): Promise<{
        id: string;
        deliveryNumber: string;
        status: import(".prisma/client").$Enums.DeliveryStatus;
        priority: import(".prisma/client").$Enums.DeliveryPriority;
        scheduledDate: string | null;
        scheduledTime: string | null;
        observations: string | null;
        failureReason: string | null;
        patient: {
            id: string;
            documentId: string;
            firstName: string;
            lastName: string;
            phone: string | null;
            address: string;
            lat: number | null;
            lng: number | null;
        };
        items: {
            id: string;
            quantity: number;
            lotNumber: string | null;
            medication: {
                id: string;
                code: string;
                name: string;
            };
        }[];
        assignment: {
            id: string;
            status: string;
            routeOrder: number;
            courier: {
                id: string;
                firstName: string;
                lastName: string;
            };
        } | null;
        evidenceCount: number;
    }>;
    getCourierDeliveries(courierId: string, page?: number, limit?: number): Promise<{
        data: {
            id: string;
            deliveryNumber: string;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            priority: import(".prisma/client").$Enums.DeliveryPriority;
            scheduledDate: string | null;
            scheduledTime: string | null;
            observations: string | null;
            failureReason: string | null;
            patient: {
                id: string;
                documentId: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                address: string;
                lat: number | null;
                lng: number | null;
            };
            items: {
                id: string;
                quantity: number;
                lotNumber: string | null;
                medication: {
                    id: string;
                    code: string;
                    name: string;
                };
            }[];
            assignment: {
                id: string;
                status: string;
                routeOrder: number;
                courier: {
                    id: string;
                    firstName: string;
                    lastName: string;
                };
            } | null;
            evidenceCount: number;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
