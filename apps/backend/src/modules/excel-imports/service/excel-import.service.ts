import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../infra/database/prisma';
import { env } from '../../../config/env';
import { generateHash, generateDeliveryNumber, chunkArray, sanitizePhone } from '@pharma/utils';
import { logger } from '../../../config/logger';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import type { DeliveryPriority } from '@prisma/client';

interface ExcelRow {
  Cedula?: string;
  cedula?: string;
  NroDocumento?: string;
  nroDocumento?: string;
  Nombre?: string;
  nombre?: string;
  Apellido?: string;
  apellido?: string;
  Telefono?: string;
  telefono?: string;
  Direccion?: string;
  direccion?: string;
  Ciudad?: string;
  ciudad?: string;
  Barrio?: string;
  barrio?: string;
  CodigoMedicamento?: string;
  codigoMedicamento?: string;
  Medicamento?: string;
  medicamento?: string;
  Cantidad?: number | string;
  cantidad?: number | string;
  Lote?: string;
  lote?: string;
  Prioridad?: string;
  prioridad?: string;
  FechaEntrega?: string | number;
  fechaEntrega?: string | number;
  HoraEntrega?: string;
  horaEntrega?: string;
  Observaciones?: string;
  observaciones?: string;
}

interface GroupedDelivery {
  documentId: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city?: string;
  neighborhood?: string;
  priority: DeliveryPriority;
  scheduledDate?: Date;
  scheduledTime?: string;
  observations?: string;
  items: Array<{
    medicationCode: string;
    medicationName: string;
    quantity: number;
    lotNumber?: string;
    rowHash: string;
  }>;
  groupHash: string;
}

function getCell(row: ExcelRow, ...keys: (keyof ExcelRow)[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && String(val).trim()) {
      return String(val).trim();
    }
  }
  return '';
}

function parsePriority(value: string): DeliveryPriority {
  const map: Record<string, DeliveryPriority> = {
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

function parseExcelDate(value: string | number | undefined): Date | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    return new Date(date.y, date.m - 1, date.d);
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

export class ExcelImportService {
  async processImport(importId: string): Promise<void> {
    const importRecord = await prisma.excelImport.findUnique({ where: { id: importId } });
    if (!importRecord) throw new NotFoundError('Excel import');

    await prisma.excelImport.update({
      where: { id: importId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const filePath = path.join(env.UPLOAD_DIR, importRecord.filePath);
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet);

    const errors: Array<{ row: number; error: string }> = [];
    const grouped = new Map<string, GroupedDelivery>();

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      try {
        const documentId = getCell(row, 'Cedula', 'cedula');
        const documentNumber = getCell(row, 'NroDocumento', 'nroDocumento');
        const medicationCode = getCell(row, 'CodigoMedicamento', 'codigoMedicamento');
        const medicationName = getCell(row, 'Medicamento', 'medicamento');

        if (!documentId) throw new ValidationError('Cedula is required');
        if (!medicationCode && !medicationName) {
          throw new ValidationError('Medication code or name is required');
        }

        const groupKey = generateHash(documentId, documentNumber || 'NONE');
        const rowHash = generateHash(
          documentId,
          documentNumber,
          medicationCode || medicationName,
          getCell(row, 'Lote', 'lote'),
          String(getCell(row, 'Cantidad', 'cantidad') || '1')
        );

        const quantityRaw = getCell(row, 'Cantidad', 'cantidad') || '1';
        const quantity = Math.max(1, parseInt(String(quantityRaw), 10) || 1);

        const item = {
          medicationCode: medicationCode || generateHash(medicationName).slice(0, 8).toUpperCase(),
          medicationName: medicationName || medicationCode,
          quantity,
          lotNumber: getCell(row, 'Lote', 'lote') || undefined,
          rowHash,
        };

        if (grouped.has(groupKey)) {
          const existing = grouped.get(groupKey)!;
          const dupItem = existing.items.find((i) => i.rowHash === rowHash);
          if (!dupItem) existing.items.push(item);
        } else {
          const nameParts = getCell(row, 'Nombre', 'nombre').split(' ');
          grouped.set(groupKey, {
            documentId,
            documentNumber,
            firstName: getCell(row, 'Nombre', 'nombre') || nameParts[0] || 'N/A',
            lastName: getCell(row, 'Apellido', 'apellido') || nameParts.slice(1).join(' ') || 'N/A',
            phone: sanitizePhone(getCell(row, 'Telefono', 'telefono')),
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
      } catch (err) {
        errors.push({
          row: rowNum,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });

    let insertedCount = 0;
    let updatedCount = 0;
    const batches = chunkArray(Array.from(grouped.values()), 50);

    for (const batch of batches) {
      await prisma.$transaction(async (tx) => {
        for (const group of batch) {
          const patientHash = generateHash(group.documentId, 'CC');
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
          } else {
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
          } else {
            delivery = await tx.delivery.create({
              data: {
                deliveryNumber: generateDeliveryNumber(),
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
            } else {
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

    await prisma.excelImport.update({
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

    logger.info('Excel import completed', { importId, insertedCount, updatedCount, errors: errors.length });
  }

  async createImport(userId: string, fileName: string, filePath: string) {
    return prisma.excelImport.create({
      data: {
        fileName,
        filePath,
        importedById: userId,
        status: 'PENDING_CALL',
      },
    });
  }

  async listImports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.excelImport.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { importedBy: { select: { firstName: true, lastName: true } } },
      }),
      prisma.excelImport.count(),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getImport(id: string) {
    const record = await prisma.excelImport.findUnique({
      where: { id },
      include: { importedBy: { select: { firstName: true, lastName: true } } },
    });
    if (!record) throw new NotFoundError('Excel import');
    return record;
  }

  async deleteImport(id: string) {
    const record = await this.getImport(id);
    await prisma.excelImport.delete({ where: { id: record.id } });
    return { message: 'Import deleted' };
  }

  async reprocessImport(id: string) {
    const record = await this.getImport(id);
    if (record.status === 'PROCESSING') {
      throw new ValidationError('Import is already processing');
    }

    await prisma.excelImport.update({
      where: { id },
      data: {
        status: 'PENDING_CALL',
        processedRows: 0,
        insertedCount: 0,
        updatedCount: 0,
        errorCount: 0,
        errors: null,
        startedAt: null,
        completedAt: null,
      },
    });

    this.processImport(id).catch((err) => logger.error('Excel reprocess failed', { err }));
    return this.getImport(id);
  }
}

export const excelImportService = new ExcelImportService();
