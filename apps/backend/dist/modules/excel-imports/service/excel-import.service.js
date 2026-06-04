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
exports.excelImportService = exports.ExcelImportService = void 0;
const XLSX = __importStar(require("xlsx"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const prisma_1 = require("../../../infra/database/prisma");
const env_1 = require("../../../config/env");
const utils_1 = require("@pharma/utils");
const logger_1 = require("../../../config/logger");
const AppError_1 = require("../../../shared/errors/AppError");
const client_1 = require("@prisma/client");
function getCell(row, ...keys) {
    for (const key of keys) {
        const val = row[key];
        if (val !== undefined && val !== null && String(val).trim()) {
            return String(val).trim();
        }
    }
    return '';
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
class ExcelImportService {
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
        const rows = XLSX.utils.sheet_to_json(sheet);
        const errors = [];
        const grouped = new Map();
        rows.forEach((row, index) => {
            const rowNum = index + 2;
            try {
                const documentId = getCell(row, 'Cedula', 'cedula');
                const documentNumber = getCell(row, 'NroDocumento', 'nroDocumento');
                const medicationCode = getCell(row, 'CodigoMedicamento', 'codigoMedicamento');
                const medicationName = getCell(row, 'Medicamento', 'medicamento');
                if (!documentId)
                    throw new AppError_1.ValidationError('Cedula is required');
                if (!medicationCode && !medicationName) {
                    throw new AppError_1.ValidationError('Medication code or name is required');
                }
                const groupKey = (0, utils_1.generateHash)(documentId, documentNumber || 'NONE');
                const rowHash = (0, utils_1.generateHash)(documentId, documentNumber, medicationCode || medicationName, getCell(row, 'Lote', 'lote'), String(getCell(row, 'Cantidad', 'cantidad') || '1'));
                const quantityRaw = getCell(row, 'Cantidad', 'cantidad') || '1';
                const quantity = Math.max(1, parseInt(String(quantityRaw), 10) || 1);
                const item = {
                    medicationCode: medicationCode || (0, utils_1.generateHash)(medicationName).slice(0, 8).toUpperCase(),
                    medicationName: medicationName || medicationCode,
                    quantity,
                    lotNumber: getCell(row, 'Lote', 'lote') || undefined,
                    rowHash,
                };
                if (grouped.has(groupKey)) {
                    const existing = grouped.get(groupKey);
                    const dupItem = existing.items.find((i) => i.rowHash === rowHash);
                    if (!dupItem)
                        existing.items.push(item);
                }
                else {
                    const nameParts = getCell(row, 'Nombre', 'nombre').split(' ');
                    grouped.set(groupKey, {
                        documentId,
                        documentNumber,
                        firstName: getCell(row, 'Nombre', 'nombre') || nameParts[0] || 'N/A',
                        lastName: getCell(row, 'Apellido', 'apellido') || nameParts.slice(1).join(' ') || 'N/A',
                        phone: (0, utils_1.sanitizePhone)(getCell(row, 'Telefono', 'telefono')),
                        address: getCell(row, 'Direccion', 'direccion') || 'Sin dirección',
                        city: getCell(row, 'Ciudad', 'ciudad') || undefined,
                        neighborhood: getCell(row, 'Barrio', 'barrio') || undefined,
                        priority: parsePriority(getCell(row, 'Prioridad', 'prioridad') || 'MEDIA'),
                        scheduledDate: parseExcelDate(row.FechaEntrega ?? row.fechaEntrega),
                        scheduledTime: getCell(row, 'HoraEntrega', 'horaEntrega') || undefined,
                        observations: getCell(row, 'Observaciones', 'observaciones') || undefined,
                        items: [item],
                        groupHash: groupKey,
                    });
                }
            }
            catch (err) {
                errors.push({
                    row: rowNum,
                    error: err instanceof Error ? err.message : 'Unknown error',
                });
            }
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
                        patient = await tx.patient.update({
                            where: { id: patient.id },
                            data: {
                                firstName: group.firstName,
                                lastName: group.lastName,
                                phone: group.phone || patient.phone,
                                address: group.address,
                                city: group.city,
                                neighborhood: group.neighborhood,
                            },
                        });
                    }
                    else {
                        patient = await tx.patient.create({
                            data: {
                                documentId: group.documentId,
                                documentType: 'CC',
                                firstName: group.firstName,
                                lastName: group.lastName,
                                phone: group.phone || null,
                                address: group.address,
                                city: group.city,
                                neighborhood: group.neighborhood,
                                uniqueHash: patientHash,
                            },
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
                                scheduledDate: group.scheduledDate,
                                scheduledTime: group.scheduledTime,
                                observations: group.observations,
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
                                scheduledDate: group.scheduledDate,
                                scheduledTime: group.scheduledTime,
                                observations: group.observations,
                                uniqueHash: deliveryHash,
                                excelImportId: importId,
                                status: 'PENDING_CALL',
                            },
                        });
                        insertedCount++;
                    }
                    for (const item of group.items) {
                        let medication = await tx.medication.findFirst({
                            where: { code: item.medicationCode, deletedAt: null },
                        });
                        if (!medication) {
                            medication = await tx.medication.create({
                                data: {
                                    code: item.medicationCode,
                                    name: item.medicationName,
                                },
                            });
                        }
                        const existingItem = await tx.deliveryItem.findFirst({
                            where: { uniqueHash: item.rowHash, deletedAt: null },
                        });
                        if (existingItem) {
                            await tx.deliveryItem.update({
                                where: { id: existingItem.id },
                                data: { quantity: item.quantity, lotNumber: item.lotNumber },
                            });
                        }
                        else {
                            await tx.deliveryItem.create({
                                data: {
                                    deliveryId: delivery.id,
                                    medicationId: medication.id,
                                    quantity: item.quantity,
                                    lotNumber: item.lotNumber,
                                    uniqueHash: item.rowHash,
                                },
                            });
                        }
                    }
                }
            });
        }
        const status = errors.length > 0 && insertedCount + updatedCount === 0 ? 'FAILED' : errors.length > 0 ? 'PARTIAL' : 'COMPLETED';
        await prisma_1.prisma.excelImport.update({
            where: { id: importId },
            data: {
                status,
                totalRows: rows.length,
                processedRows: rows.length,
                insertedCount,
                updatedCount,
                errorCount: errors.length,
                errors: errors.length > 0 ? errors : undefined,
                completedAt: new Date(),
            },
        });
        logger_1.logger.info('Excel import completed', { importId, insertedCount, updatedCount, errors: errors.length });
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
