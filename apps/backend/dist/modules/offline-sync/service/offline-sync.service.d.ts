import type { Server } from 'socket.io';
interface SyncItem {
    id: string;
    type: 'STATUS_UPDATE' | 'EVIDENCE' | 'INCIDENT' | 'GPS' | 'SIGNATURE';
    payload: Record<string, unknown>;
}
export declare class OfflineSyncService {
    private io?;
    private deliveryService;
    private incidentService;
    constructor(io?: Server | undefined);
    processSync(userId: string, deviceId: string, items: SyncItem[]): Promise<{
        syncId: string;
        results: {
            id: string;
            success: boolean;
            error?: string;
        }[];
    }>;
    listPending(userId: string): Promise<{
        status: import(".prisma/client").$Enums.OfflineSyncStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        deviceId: string;
        payload: import("@prisma/client/runtime/library").JsonValue;
        retryCount: number;
        lastError: string | null;
        syncedAt: Date | null;
    }[]>;
}
export declare function createOfflineSyncService(io?: Server): OfflineSyncService;
export {};
