import { CallManagementResult, CallQueueStatus, Prisma } from '@prisma/client';
export declare class CallAssignmentService {
    listPendingCalls(page?: number, limit?: number, search?: string): Promise<{
        data: {
            id: string;
            deliveryNumber: string;
            documentNumber: string | null;
            status: import(".prisma/client").$Enums.DeliveryStatus;
            observations: string | null;
            createdAt: Date;
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
            medications: {
                name: string;
                code: string;
                cum: string | null;
                quantity: number;
            }[];
            assignedOperator: {
                firstName: string;
                lastName: string;
            };
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    assignToOperator(deliveryIds: string[], operatorUserId: string, assignedById: string): Promise<({
        operator: {
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
        status: import(".prisma/client").$Enums.CallQueueStatus;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deliveryId: string;
        assignedById: string;
        assignedAt: Date;
        completedAt: Date | null;
        operatorUserId: string;
        managementResult: import(".prisma/client").$Enums.CallManagementResult | null;
        observations: string | null;
        callDate: Date | null;
        callTime: string | null;
        durationSec: number | null;
        phoneUsed: string | null;
    })[]>;
    listMyCalls(operatorUserId: string, filters: {
        status?: CallQueueStatus;
        page?: number;
        limit?: number;
    }, options?: {
        allOperators?: boolean;
    }): Promise<{
        data: {
            previousObservations: string | null;
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
                assignments: ({
                    intermunicipalRoute: {
                        id: string;
                        routeDate: Date;
                        routeCode: string;
                    } | null;
                    courier: {
                        id: string;
                        firstName: string;
                        lastName: string;
                    };
                    route: {
                        id: string;
                        routeDate: Date;
                    } | null;
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
                    createdAt: Date;
                    fileName: string;
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
                callHistory: {
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
            };
            status: import(".prisma/client").$Enums.CallQueueStatus;
            id: string;
            deletedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            deliveryId: string;
            assignedById: string;
            assignedAt: Date;
            completedAt: Date | null;
            operatorUserId: string;
            managementResult: import(".prisma/client").$Enums.CallManagementResult | null;
            observations: string | null;
            callDate: Date | null;
            callTime: string | null;
            durationSec: number | null;
            phoneUsed: string | null;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateAssignment(assignmentId: string, operatorUserId: string, input: {
        status?: CallQueueStatus;
        managementResult?: CallManagementResult;
        observations?: string;
        callDate?: string;
        callTime?: string;
        durationSec?: number;
        phoneUsed?: string;
        patientUpdates?: Partial<{
            address: string;
            neighborhood: string;
            city: string;
            addressDetail: string;
            phone: string;
            phoneAlt: string;
            phoneFamily: string;
            phoneAlternative: string;
        }>;
        rescheduleDate?: string;
        rescheduleTime?: string;
        action?: 'CONFIRM' | 'PENDING' | 'DEACTIVATE' | 'REACTIVATE' | 'RESCHEDULE';
        deactivationReason?: import('@prisma/client').DeactivationReason;
        pendingSubreason?: import('@prisma/client').PendingSubreason;
    }, options?: {
        bypassOperatorCheck?: boolean;
        actingUserId?: string;
    }): Promise<{
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
        status: import(".prisma/client").$Enums.CallQueueStatus;
        id: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        deliveryId: string;
        assignedById: string;
        assignedAt: Date;
        completedAt: Date | null;
        operatorUserId: string;
        managementResult: import(".prisma/client").$Enums.CallManagementResult | null;
        observations: string | null;
        callDate: Date | null;
        callTime: string | null;
        durationSec: number | null;
        phoneUsed: string | null;
    }>;
    getManagementStats(dateFrom?: Date, dateTo?: Date): Promise<{
        total: number;
        byResult: {
            result: import(".prisma/client").$Enums.CallManagementResult | null;
            count: number;
        }[];
        operators: {
            operatorId: string;
            name: string;
            total: number;
            confirmed: number;
            effectiveness: number;
        }[];
    }>;
    listOperators(): Promise<{
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        operatorProfile: {
            code: string;
        } | null;
    }[]>;
}
export declare const callAssignmentService: CallAssignmentService;
