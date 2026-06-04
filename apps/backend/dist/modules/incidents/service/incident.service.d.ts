import type { IncidentType, EvidenceType } from '@prisma/client';
import type { Server } from 'socket.io';
export declare class IncidentService {
    private io?;
    constructor(io?: Server | undefined);
    create(input: {
        deliveryId: string;
        reportedById: string;
        type: IncidentType;
        description: string;
        lat?: number;
        lng?: number;
        accuracy?: number;
    }): Promise<{
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
    }>;
    list(filters: {
        deliveryId?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
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
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
}
export declare class EvidenceService {
    upload(input: {
        deliveryId: string;
        uploadedById: string;
        type: EvidenceType;
        buffer: Buffer;
        fileName: string;
        incidentId?: string;
        lat?: number;
        lng?: number;
    }): Promise<{
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
    }>;
    listByDelivery(deliveryId: string): Promise<{
        id: string;
        deliveryId: string;
        type: import(".prisma/client").$Enums.EvidenceType;
        fileName: string;
        mimeType: string;
        fileSize: number;
        lat: number | null;
        lng: number | null;
        createdAt: Date;
        uploadedBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        fileUrl: string;
    }[]>;
    getFile(id: string): Promise<{
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
        };
        fullPath: string;
    }>;
}
export declare function createIncidentService(io?: Server): IncidentService;
export declare const evidenceService: EvidenceService;
