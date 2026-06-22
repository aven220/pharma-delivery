"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelImportService = exports.ExcelImportService = exports.DELIVERY_IMPORT_COLUMNS = exports.buildMedicationKey = exports.buildDeliveryItemHash = void 0;
const XLSX = __importStar(require("xlsx"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../../infra/database/prisma");
const env_1 = require("../../../config/env");
const utils_1 = require("@pharma/utils");
const logger_1 = require("../../../config/logger");
const AppError_1 = require("../../../shared/errors/AppError");
const delivery_status_service_1 = require("../../deliveries/service/delivery-status.service");
const client_1 = require("@prisma/client");
const excel_import_rows_1 = require("./excel-import.rows");
var excel_import_rows_2 = require("./excel-import.rows");
Object.defineProperty(exports, "buildDeliveryItemHash", { enumerable: true, get: function () { return excel_import_rows_2.buildDeliveryItemHash; } });
Object.defineProperty(exports, "buildMedicationKey", { enumerable: true, get: function () { return excel_import_rows_2.buildMedicationKey; } });
function parsePatientName(row) {
    const fullName = (0, excel_import_rows_1.getCell)(row, 'Nombre', 'nombre');
    const legacyLast = (0, excel_import_rows_1.getCell)(row, 'Apellido', 'apellido');
    if (legacyLast && !fullName.includes(' ')) {
        return { firstName: fullName || legacyLast, lastName: legacyLast };
    }
    if (!fullName)
        return { firstName: 'Sin nombre', lastName: '.' };
    return { firstName: fullName, lastName: '.' };
}
function parsePhones(row) {
    const rawMain = (0, excel_import_rows_1.getCell)(row, 'Telefono', 'telefono');
    const splitFromMain = rawMain
        .split(/[/;,|]/)
        .map((p) => (0, utils_1.sanitizePhone)(p.trim()))
        .filter(Boolean);
    const phone = splitFromMain[0] || (0, utils_1.sanitizePhone)(rawMain) || '';
    const col2 = (0, utils_1.sanitizePhone)((0, excel_import_rows_1.getCell)(row, 'Telefono2', 'telefono2', 'TelefonoAlt', 'telefonoAlt'));
    const col3 = (0, utils_1.sanitizePhone)((0, excel_import_rows_1.getCell)(row, 'Telefono3', 'telefono3'));
    return {
        phone,
        phoneAlt: splitFromMain[1] || col2 || undefined,
        phoneFamily: splitFromMain[2] || col3 || undefined,
        phoneAlternative: splitFromMain[3] || undefined,
    };
}
function parsePendingGeneratedDate(row) {
    return parseExcelDate(row.FechaPendiente ?? row.fechaPendiente ?? row.FechaEntrega ?? row.fechaEntrega);
}
function sortImportRows(rows) {
    return [...rows].sort((a, b) => {
        const cedulaA = (0, excel_import_rows_1.getCell)(a, 'Cedula', 'cedula');
        const cedulaB = (0, excel_import_rows_1.getCell)(b, 'Cedula', 'cedula');
        if (cedulaA !== cedulaB)
            return cedulaA.localeCompare(cedulaB, 'es', { numeric: true });
        const docA = (0, excel_import_rows_1.getDispensacionNumber)(a) || 'NONE';
        const docB = (0, excel_import_rows_1.getDispensacionNumber)(b) || 'NONE';
        if (docA !== docB)
            return docA.localeCompare(docB, 'es', { numeric: true });
        const medA = (0, excel_import_rows_1.getCell)(a, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum') ||
            (0, excel_import_rows_1.getCell)(a, 'Medicamento', 'medicamento');
        const medB = (0, excel_import_rows_1.getCell)(b, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum') ||
            (0, excel_import_rows_1.getCell)(b, 'Medicamento', 'medicamento');
        return medA.localeCompare(medB, 'es', { numeric: true });
    });
}
function parsePriority(value) {
    const map = {
        URGENTE: 'URGENT',
        URGENT: 'URGENT',
        ALTA: 'HIGH',
        HIGH: 'HIGH',
        MEDIA: 'MEDIUM',
        MEDIUM: 'MEDIUM',
        BAJA: 'LOW',
        LOW: 'LOW',
    };
    return map[value.toUpperCase()] || 'MEDIUM';
}
function parseExcelDate(value) {
    if (!value)
        return undefined;
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        return new Date(date.y, date.m - 1, date.d);
    }
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? undefined : parsed;
}
function buildPatientCreateData(group) {
    return {
        documentId: group.documentId,
        documentType: 'CC',
        firstName: group.firstName,
        lastName: group.lastName,
        phone: group.phone || null,
        phoneAlt: group.phoneAlt || null,
        phoneFamily: group.phoneFamily || null,
        phoneAlternative: group.phoneAlternative || null,
        address: group.address,
        city: group.city,
        neighborhood: group.neighborhood,
        uniqueHash: (0, utils_1.generateHash)(group.documentId, 'CC'),
    };
}
function buildPatientUpdateIfEmpty(patient, group) {
    const data = {};
    if ((patient.lastName === '.' || patient.firstName === 'Sin nombre') &&
        group.firstName !== 'Sin nombre') {
        data.firstName = group.firstName;
        data.lastName = group.lastName;
    }
    if (!patient.phone && group.phone)
        data.phone = group.phone;
    if (!patient.phoneAlt && group.phoneAlt)
        data.phoneAlt = group.phoneAlt;
    if (!patient.phoneFamily && group.phoneFamily)
        data.phoneFamily = group.phoneFamily;
    if (!patient.phoneAlternative && group.phoneAlternative) {
        data.phoneAlternative = group.phoneAlternative;
    }
    if ((!patient.address || patient.address === 'Sin dirección') && group.address) {
        data.address = group.address;
    }
    if (!patient.city && group.city)
        data.city = group.city;
    if (!patient.neighborhood && group.neighborhood)
        data.neighborhood = group.neighborhood;
    return data;
}
function parseExcelSheet(sheet) {
    const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
        raw: false,
    });
    const mapped = (0, excel_import_rows_1.parseExcelSheetMatrix)(matrix);
    return sortImportRows((0, excel_import_rows_1.fillDownImportRows)(mapped));
}
exports.DELIVERY_IMPORT_COLUMNS = [
    'Cedula',
    'NroDispensacion',
    'Nombre',
    'Telefono',
    'Telefono2',
    'Telefono3',
    'Direccion',
    'CodigoMedicamento',
    'Medicamento',
    'Cantidad',
    'Prioridad',
    'FechaPendiente',
];
const DELIVERY_TEMPLATE_EXAMPLES = [
    {
        Cedula: '1010091313',
        NombrePaciente: 'MARTHA CECILIA SOTO',
        NroDispensacion: '10020',
        FechaDispensacion: '2024-05-15',
        CodigoMedicamento: '7702133010113',
        NombreMedicamento: 'ACETAMINOFEN 500 MG TABLETA',
        CantidadEntregada: 30,
        Ciudad: 'BOGOTA',
    },
    {
        Cedula: '1010091313',
        NombrePaciente: 'MARTHA CECILIA SOTO',
        NroDispensacion: '10020',
        FechaDispensacion: '2024-05-15',
        CodigoMedicamento: '7702133010114',
        NombreMedicamento: 'IBUPROFENO 400 MG TABLETA',
        CantidadEntregada: 20,
        Ciudad: 'BOGOTA',
    },
];
class ExcelImportService {
    generateTemplateBuffer() {
        const ws = XLSX.utils.json_to_sheet(DELIVERY_TEMPLATE_EXAMPLES);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Entregas pendientes');
        const instructions = XLSX.utils.aoa_to_sheet([
            ['Instrucciones'],
            ['Nombre', 'Nombre completo del paciente (un solo campo)'],
            ['Telefono / Telefono2 / Telefono3', 'Hasta 3 teléfonos. También puede separar con / en Telefono'],
            [
                'CodigoMedicamento',
                'Una fila por medicamento. Misma cédula + misma dispensación + distinto código = varios medicamentos en la misma entrega',
            ],
            [
                'Celdas combinadas',
                'Si deja vacía cédula/dispensación en filas siguientes (mismo paciente), el sistema las completa automáticamente',
            ],
            ['Lote', 'No incluir — se registra al empacar en Preparar pendientes'],
            ['HoraEntrega', 'No incluir — se define en llamadas / gestión'],
        ]);
        XLSX.utils.book_append_sheet(wb, instructions, 'Instrucciones');
        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    }
    async processImport(importId) {
        const importRecord = await prisma_1.prisma.excelImport.findUnique({ where: { id: importId } });
        if (!importRecord)
            throw new AppError_1.NotFoundError('Excel import');
        await prisma_1.prisma.excelImport.update({
            where: { id: importId },
            data: { status: 'PROCESSING', startedAt: new Date() },
        });
        const filePath = path_1.default.join(env_1.env.UPLOAD_DIR, importRecord.filePath);
        const buffer = await promises_1.default.readFile(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const sortedRows = parseExcelSheet(sheet);
        const { grouped, errors } = (0, excel_import_rows_1.groupImportRows)(sortedRows, {
            generateHash: utils_1.generateHash,
            parsePatientName,
            parsePhones,
            parsePriority,
            parsePendingGeneratedDate,
            getAddress: (row) => (0, excel_import_rows_1.getCell)(row, 'Direccion', 'direccion') || 'Sin dirección',
            getCity: (row) => (0, excel_import_rows_1.getCell)(row, 'Ciudad', 'ciudad') || undefined,
            getNeighborhood: (row) => (0, excel_import_rows_1.getCell)(row, 'Barrio', 'barrio') || undefined,
            getObservations: (row) => (0, excel_import_rows_1.getCell)(row, 'Observaciones', 'observaciones') || undefined,
            getPriorityRaw: (row) => (0, excel_import_rows_1.getCell)(row, 'Prioridad', 'prioridad'),
        });
        let insertedCount = 0;
        let updatedCount = 0;
        const batches = (0, utils_1.chunkArray)(Array.from(grouped.values()), 50);
        for (const batch of batches) {
            await prisma_1.prisma.$transaction(async (tx) => {
                for (const group of batch) {
                    const patientHash = (0, utils_1.generateHash)(group.documentId, 'CC');
                    let patient = await tx.patient.findFirst({
                        where: { uniqueHash: patientHash, deletedAt: null },
                    });
                    if (patient) {
                        const updateData = buildPatientUpdateIfEmpty(patient, group);
                        if (Object.keys(updateData).length > 0) {
                            patient = await tx.patient.update({
                                where: { id: patient.id },
                                data: updateData,
                            });
                        }
                    }
                    else {
                        patient = await tx.patient.create({
                            data: buildPatientCreateData(group),
                        });
                    }
                    const deliveryHash = group.groupHash;
                    let delivery = await tx.delivery.findFirst({
                        where: { uniqueHash: deliveryHash, deletedAt: null },
                    });
                    if (delivery) {
                        delivery = await tx.delivery.update({
                            where: { id: delivery.id },
                            data: {
                                priority: group.priority,
                                pendingGeneratedAt: group.pendingGeneratedAt ?? delivery.pendingGeneratedAt,
                                observations: group.observations ?? delivery.observations,
                                documentNumber: group.documentNumber,
                                excelImportId: importId,
                            },
                        });
                        updatedCount++;
                    }
                    else {
                        delivery = await tx.delivery.create({
                            data: {
                                deliveryNumber: (0, utils_1.generateDeliveryNumber)(),
                                documentNumber: group.documentNumber,
                                patientId: patient.id,
                                priority: group.priority,
                                pendingGeneratedAt: group.pendingGeneratedAt ?? new Date(),
                                observations: group.observations,
                                uniqueHash: deliveryHash,
                                excelImportId: importId,
                                status: 'LIBRE',
                            },
                        });
                        await delivery_status_service_1.deliveryStatusService.logStatusChange(tx, {
                            deliveryId: delivery.id,
                            fromStatus: null,
                            toStatus: 'LIBRE',
                            action: 'IMPORT_CREATED',
                            changedById: importRecord.importedById,
                            observations: `Importación ${importRecord.fileName}`,
                        });
                        insertedCount++;
                    }
                    const importedItemHashes = new Set(group.items.map((i) => i.rowHash));
                    for (const item of group.items) {
                        let medication = await tx.medication.findFirst({
                            where: { code: item.medicationCode, deletedAt: null },
                        });
                        if (!medication) {
                            medication = await tx.medication.create({
                                data: {
                                    code: item.medicationCode,
                                    name: item.medicationName,
                                    cum: item.medicationCode.length >= 6 ? item.medicationCode : undefined,
                                },
                            });
                        }
                        else if (medication.name !== item.medicationName) {
                            await tx.medication.update({
                                where: { id: medication.id },
                                data: { name: item.medicationName },
                            });
                        }
                        const existingItem = await tx.deliveryItem.findFirst({
                            where: { uniqueHash: item.rowHash, deletedAt: null },
                        });
                        if (existingItem) {
                            if (existingItem.deliveryId !== delivery.id) {
                                await tx.deliveryItem.update({
                                    where: { id: existingItem.id },
                                    data: { deliveryId: delivery.id, quantity: item.quantity },
                                });
                            }
                            else {
                                await tx.deliveryItem.update({
                                    where: { id: existingItem.id },
                                    data: { quantity: item.quantity },
                                });
                            }
                        }
                        else {
                            await tx.deliveryItem.create({
                                data: {
                                    deliveryId: delivery.id,
                                    medicationId: medication.id,
                                    quantity: item.quantity,
                                    uniqueHash: item.rowHash,
                                },
                            });
                        }
                    }
                    // Líneas que ya no vienen en el Excel se marcan eliminadas (reimportación limpia por dispensación)
                    await tx.deliveryItem.updateMany({
                        where: {
                            deliveryId: delivery.id,
                            deletedAt: null,
                            uniqueHash: { notIn: [...importedItemHashes] },
                        },
                        data: { deletedAt: new Date() },
                    });
                }
            });
        }
        const status = errors.length > 0 && insertedCount + updatedCount === 0
            ? 'FAILED'
            : errors.length > 0
                ? 'PARTIAL'
                : 'COMPLETED';
        await prisma_1.prisma.excelImport.update({
            where: { id: importId },
            data: {
                status,
                totalRows: sortedRows.length,
                processedRows: sortedRows.length,
                insertedCount,
                updatedCount,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined,
                completedAt: new Date(),
            },
        });
        logger_1.logger.info('Excel import completed', {
            importId,
            insertedCount,
            updatedCount,
            errors: errors.length,
            groups: grouped.size,
            itemsPerGroup: [...grouped.values()].map((g) => ({
                dispensacion: g.documentNumber,
                cedula: g.documentId,
                items: g.items.length,
                meds: g.items.map((i) => i.medicationCode),
            })),
        });
    }
    async createImport(userId, fileName, filePath) {
        return prisma_1.prisma.excelImport.create({
            data: {
                fileName,
                filePath,
                importedById: userId,
                status: 'PENDING',
            },
        });
    }
    async listImports(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            prisma_1.prisma.excelImport.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { importedBy: { select: { firstName: true, lastName: true } } },
            }),
            prisma_1.prisma.excelImport.count(),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getImport(id) {
        const record = await prisma_1.prisma.excelImport.findUnique({
            where: { id },
            include: { importedBy: { select: { firstName: true, lastName: true } } },
        });
        if (!record)
            throw new AppError_1.NotFoundError('Excel import');
        return record;
    }
    async deleteImport(id) {
        const record = await this.getImport(id);
        await prisma_1.prisma.excelImport.delete({ where: { id: record.id } });
        return { message: 'Import deleted' };
    }
    async reprocessImport(id) {
        const record = await this.getImport(id);
        if (record.status === 'PROCESSING') {
            throw new AppError_1.ValidationError('Import is already processing');
        }
        await prisma_1.prisma.excelImport.update({
            where: { id },
            data: {
                status: 'PENDING',
                processedRows: 0,
                insertedCount: 0,
                updatedCount: 0,
                errorCount: 0,
                errors: client_1.Prisma.DbNull,
                startedAt: null,
                completedAt: null,
            },
        });
        this.processImport(id).catch((err) => logger_1.logger.error('Excel reprocess failed', { err }));
        return this.getImport(id);
    }
}
exports.ExcelImportService = ExcelImportService;
exports.excelImportService = new ExcelImportService();
