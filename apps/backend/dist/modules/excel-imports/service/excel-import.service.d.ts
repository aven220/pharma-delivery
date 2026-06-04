import { Prisma } from '@prisma/client';
export declare class ExcelImportService {
    processImport(importId: string): Promise<void>;
    createImport(userId: string, fileName: string, filePath: string): Promise<{
        status: import(".prisma/client").$Enums.ExcelImportStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
        filePath: string;
        fileName: string;
        totalRows: number;
        processedRows: number;
        insertedCount: number;
        updatedCount: number;
        errorCount: number;
        errors: Prisma.JsonValue | null;
        importedById: string;
        startedAt: Date | null;
    }>;
    listImports(page?: number, limit?: number): Promise<{
        data: ({
            importedBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            status: import(".prisma/client").$Enums.ExcelImportStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            completedAt: Date | null;
            filePath: string;
            fileName: string;
            totalRows: number;
            processedRows: number;
            insertedCount: number;
            updatedCount: number;
            errorCount: number;
            errors: Prisma.JsonValue | null;
            importedById: string;
            startedAt: Date | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getImport(id: string): Promise<{
        importedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ExcelImportStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
        filePath: string;
        fileName: string;
        totalRows: number;
        processedRows: number;
        insertedCount: number;
        updatedCount: number;
        errorCount: number;
        errors: Prisma.JsonValue | null;
        importedById: string;
        startedAt: Date | null;
    }>;
    deleteImport(id: string): Promise<{
        message: string;
    }>;
    reprocessImport(id: string): Promise<{
        importedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ExcelImportStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        completedAt: Date | null;
        filePath: string;
        fileName: string;
        totalRows: number;
        processedRows: number;
        insertedCount: number;
        updatedCount: number;
        errorCount: number;
        errors: Prisma.JsonValue | null;
        importedById: string;
        startedAt: Date | null;
    }>;
}
export declare const excelImportService: ExcelImportService;
