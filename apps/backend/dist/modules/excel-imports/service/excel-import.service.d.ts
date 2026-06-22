import { Prisma } from '@prisma/client';
export { buildDeliveryItemHash, buildMedicationKey, } from './excel-import.rows';
export declare const DELIVERY_IMPORT_COLUMNS: readonly ["Cedula", "NroDispensacion", "Nombre", "Telefono", "Telefono2", "Telefono3", "Direccion", "CodigoMedicamento", "Medicamento", "Cantidad", "Prioridad", "FechaPendiente"];
export declare class ExcelImportService {
    generateTemplateBuffer(): Buffer;
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
