import { MedicationStatus } from '@prisma/client';
export declare class MedicationService {
    list(page?: number, limit?: number, search?: string, status?: MedicationStatus): Promise<{
        data: {
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
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    search(query: string, limit?: number): Promise<{
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
    }[]>;
    getByCum(cum: string): Promise<{
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
    }>;
    private findExisting;
    create(input: {
        cum?: string;
        code: string;
        name: string;
        laboratory?: string;
        presentation?: string;
        concentration?: string;
        status?: MedicationStatus;
    }): Promise<{
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
    }>;
    update(id: string, input: Partial<{
        cum: string;
        code: string;
        name: string;
        laboratory: string;
        presentation: string;
        concentration: string;
        status: MedicationStatus;
    }>): Promise<{
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
    }>;
    bulkImport(buffer: Buffer): Promise<{
        inserted: number;
        updated: number;
        errors: number;
        total: number;
    }>;
    private normalizeRow;
}
export declare const medicationService: MedicationService;
