import { DeliveryPriority } from '@prisma/client';
interface MedicationInput {
    medicationCode: string;
    medicationName: string;
    quantity: number;
    lotNumber?: string;
    observations?: string;
}
export declare class PatientService {
    list(page?: number, limit?: number, search?: string): Promise<{
        data: ({
            _count: {
                deliveries: number;
            };
        } & {
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
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(id: string): Promise<{
        deliveries: ({
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
                unitPrice: import("@prisma/client/runtime/library").Decimal | null;
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
    } & {
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
    }>;
    private createDeliveryWithItems;
    createManualWithDelivery(input: {
        documentId: string;
        documentType?: string;
        firstName: string;
        lastName: string;
        phone?: string;
        address: string;
        city?: string;
        neighborhood?: string;
        observations?: string;
        priority?: DeliveryPriority;
        scheduledDate?: string;
        scheduledTime?: string;
        documentNumber?: string;
        medications?: MedicationInput[];
    }, options?: {
        rejectDuplicate?: boolean;
    }): Promise<{
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
        delivery: null;
        items: never[];
    } | {
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
            unitPrice: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    createDeliveryForPatient(input: {
        patientId?: string;
        newPatient?: {
            documentId: string;
            documentType?: string;
            firstName: string;
            lastName: string;
            phone?: string;
            address: string;
            city?: string;
            neighborhood?: string;
        };
        priority?: DeliveryPriority;
        observations?: string;
        scheduledDate?: string;
        scheduledTime?: string;
        documentNumber?: string;
        medications: MedicationInput[];
    }): Promise<{
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
        delivery: null;
        items: never[];
    } | {
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
            unitPrice: import("@prisma/client/runtime/library").Decimal | null;
        })[];
    }>;
    getFullHistory(id: string): Promise<{
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
        changeLogs: ({
            changedBy: {
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            patientId: string;
            field: string;
            oldValue: string | null;
            newValue: string | null;
            changedById: string;
        })[];
        deliveries: ({
            assignments: ({
                courier: {
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
                unitPrice: import("@prisma/client/runtime/library").Decimal | null;
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
        callHistory: ({
            operator: {
                user: {
                    firstName: string;
                    lastName: string;
                };
            } & {
                code: string;
                id: string;
                deletedAt: Date | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
            };
            delivery: {
                deliveryNumber: string;
            };
        } & {
            result: import(".prisma/client").$Enums.CallResult;
            id: string;
            createdAt: Date;
            deliveryId: string;
            observations: string | null;
            durationSec: number | null;
            phoneUsed: string;
            patientId: string;
            operatorId: string;
            newPhone: string | null;
            newAddress: string | null;
            rescheduleDate: Date | null;
            rescheduleTime: string | null;
            calledAt: Date;
        })[];
        incidents: ({
            delivery: {
                deliveryNumber: string;
            };
            reportedBy: {
                firstName: string;
                lastName: string;
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
        statusLogs: ({
            delivery: {
                deliveryNumber: string;
            };
            changedBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            deliveryId: string;
            action: string;
            fromStatus: import(".prisma/client").$Enums.DeliveryStatus | null;
            toStatus: import(".prisma/client").$Enums.DeliveryStatus;
            observations: string | null;
            changedById: string;
            deactivationReason: import(".prisma/client").$Enums.DeactivationReason | null;
            pendingSubreason: import(".prisma/client").$Enums.PendingSubreason | null;
        })[];
    }>;
}
export declare const patientService: PatientService;
export {};
