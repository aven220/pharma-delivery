import type { DeliveryPriority } from '@prisma/client';
export interface ExcelRow {
    Cedula?: string;
    cedula?: string;
    NroDocumento?: string;
    nroDocumento?: string;
    NroDispensacion?: string;
    nroDispensacion?: string;
    Dispensacion?: string;
    dispensacion?: string;
    Nombre?: string;
    nombre?: string;
    Apellido?: string;
    apellido?: string;
    Telefono?: string;
    telefono?: string;
    Telefono2?: string;
    telefono2?: string;
    Telefono3?: string;
    telefono3?: string;
    TelefonoAlt?: string;
    telefonoAlt?: string;
    Direccion?: string;
    direccion?: string;
    Ciudad?: string;
    ciudad?: string;
    Barrio?: string;
    barrio?: string;
    CodigoMedicamento?: string;
    codigoMedicamento?: string;
    CUM?: string;
    cum?: string;
    Medicamento?: string;
    medicamento?: string;
    Cantidad?: number | string;
    cantidad?: number | string;
    Prioridad?: string;
    prioridad?: string;
    FechaPendiente?: string | number;
    fechaPendiente?: string | number;
    FechaEntrega?: string | number;
    fechaEntrega?: string | number;
    Observaciones?: string;
    observaciones?: string;
}
export declare function normalizeExcelCell(val: unknown): string;
export declare function normalizeHeaderKey(key: string): string;
export declare function mapRawExcelRow(raw: Record<string, unknown>): ExcelRow;
export declare function getCell(row: ExcelRow, ...keys: (keyof ExcelRow)[]): string;
export declare function getDispensacionNumber(row: ExcelRow): string;
export declare function isBlankImportRow(row: ExcelRow): boolean;
/** Rellena cédula/dispensación vacías con la fila anterior (Excel con celdas combinadas). */
export declare function fillDownImportRows(rows: ExcelRow[]): ExcelRow[];
/** Detecta fila de encabezados (aunque no sea la fila 1) y parsea datos. */
export declare function parseExcelSheetMatrix(matrix: unknown[][]): ExcelRow[];
export declare function buildMedicationKey(medicationCode: string, medicationName: string): string;
export declare function buildDeliveryItemHash(documentId: string, documentNumber: string, medicationCode: string, medicationName: string): string;
export interface GroupedImportItem {
    medicationCode: string;
    medicationName: string;
    quantity: number;
    rowHash: string;
}
export interface GroupedImportDelivery {
    documentId: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    phone: string;
    phoneAlt?: string;
    phoneFamily?: string;
    phoneAlternative?: string;
    address: string;
    city?: string;
    neighborhood?: string;
    priority: DeliveryPriority;
    pendingGeneratedAt?: Date;
    observations?: string;
    items: GroupedImportItem[];
    groupHash: string;
}
export declare function groupImportRows(rows: ExcelRow[], deps: {
    generateHash: (...parts: (string | number | null | undefined)[]) => string;
    parsePatientName: (row: ExcelRow) => {
        firstName: string;
        lastName: string;
    };
    parsePhones: (row: ExcelRow) => {
        phone: string;
        phoneAlt?: string;
        phoneFamily?: string;
        phoneAlternative?: string;
    };
    parsePriority: (value: string) => DeliveryPriority;
    parsePendingGeneratedDate: (row: ExcelRow) => Date | undefined;
    getAddress: (row: ExcelRow) => string;
    getCity: (row: ExcelRow) => string | undefined;
    getNeighborhood: (row: ExcelRow) => string | undefined;
    getObservations: (row: ExcelRow) => string | undefined;
    getPriorityRaw: (row: ExcelRow) => string;
}): {
    grouped: Map<string, GroupedImportDelivery>;
    errors: Array<{
        row: number;
        error: string;
    }>;
};
