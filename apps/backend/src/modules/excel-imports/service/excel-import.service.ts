import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../../../infra/database/prisma';
import { env } from '../../../config/env';
import { generateHash, generateDeliveryNumber, chunkArray, sanitizePhone } from '@pharma/utils';
import { logger } from '../../../config/logger';
import { ValidationError, NotFoundError } from '../../../shared/errors/AppError';
import { deliveryStatusService } from '../../deliveries/service/delivery-status.service';
import { DeliveryPriority, Prisma } from '@prisma/client';

interface ExcelRow {
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

interface GroupedDelivery {
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
  items: Array<{
    medicationCode: string;
    medicationName: string;
    quantity: number;
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

function getDispensacionNumber(row: ExcelRow): string {
  return getCell(
    row,
    'NroDispensacion',
    'nroDispensacion',
    'Dispensacion',
    'dispensacion',
    'NroDocumento',
    'nroDocumento'
  );
}

function parsePatientName(row: ExcelRow): { firstName: string; lastName: string } {
  const fullName = getCell(row, 'Nombre', 'nombre');
  const legacyLast = getCell(row, 'Apellido', 'apellido');
  if (legacyLast && !fullName.includes(' ')) {
    return { firstName: fullName || legacyLast, lastName: legacyLast };
  }
  if (!fullName) return { firstName: 'Sin nombre', lastName: '.' };
  return { firstName: fullName, lastName: '.' };
}

function parsePhones(row: ExcelRow): {
  phone: string;
  phoneAlt?: string;
  phoneFamily?: string;
  phoneAlternative?: string;
} {
  const rawMain = getCell(row, 'Telefono', 'telefono');
  const splitFromMain = rawMain
    .split(/[/;,|]/)
    .map((p) => sanitizePhone(p.trim()))
    .filter(Boolean);

  const phone = splitFromMain[0] || sanitizePhone(rawMain) || '';
  const col2 = sanitizePhone(getCell(row, 'Telefono2', 'telefono2', 'TelefonoAlt', 'telefonoAlt'));
  const col3 = sanitizePhone(getCell(row, 'Telefono3', 'telefono3'));

  return {
    phone,
    phoneAlt: splitFromMain[1] || col2 || undefined,
    phoneFamily: splitFromMain[2] || col3 || undefined,
    phoneAlternative: splitFromMain[3] || undefined,
  };
}

function parsePendingGeneratedDate(row: ExcelRow): Date | undefined {
  return parseExcelDate(
    row.FechaPendiente ?? row.fechaPendiente ?? row.FechaEntrega ?? row.fechaEntrega
  );
}

function sortImportRows(rows: ExcelRow[]): ExcelRow[] {
  return [...rows].sort((a, b) => {
    const cedulaA = getCell(a, 'Cedula', 'cedula');
    const cedulaB = getCell(b, 'Cedula', 'cedula');
    if (cedulaA !== cedulaB) return cedulaA.localeCompare(cedulaB, 'es', { numeric: true });

    const docA = getDispensacionNumber(a) || 'NONE';
    const docB = getDispensacionNumber(b) || 'NONE';
    if (docA !== docB) return docA.localeCompare(docB, 'es', { numeric: true });

    const medA =
      getCell(a, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum') ||
      getCell(a, 'Medicamento', 'medicamento');
    const medB =
      getCell(b, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum') ||
      getCell(b, 'Medicamento', 'medicamento');
    return medA.localeCompare(medB, 'es', { numeric: true });
  });
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

function buildPatientCreateData(group: GroupedDelivery) {
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
    uniqueHash: generateHash(group.documentId, 'CC'),
  };
}

function buildPatientUpdateIfEmpty(
  patient: {
    firstName: string;
    lastName: string;
    phone: string | null;
    phoneAlt: string | null;
    phoneFamily: string | null;
    phoneAlternative: string | null;
    address: string;
    city: string | null;
    neighborhood: string | null;
  },
  group: GroupedDelivery
): Prisma.PatientUpdateInput {
  const data: Prisma.PatientUpdateInput = {};

  if (
    (patient.lastName === '.' || patient.firstName === 'Sin nombre') &&
    group.firstName !== 'Sin nombre'
  ) {
    data.firstName = group.firstName;
    data.lastName = group.lastName;
  }
  if (!patient.phone && group.phone) data.phone = group.phone;
  if (!patient.phoneAlt && group.phoneAlt) data.phoneAlt = group.phoneAlt;
  if (!patient.phoneFamily && group.phoneFamily) data.phoneFamily = group.phoneFamily;
  if (!patient.phoneAlternative && group.phoneAlternative) {
    data.phoneAlternative = group.phoneAlternative;
  }
  if ((!patient.address || patient.address === 'Sin dirección') && group.address) {
    data.address = group.address;
  }
  if (!patient.city && group.city) data.city = group.city;
  if (!patient.neighborhood && group.neighborhood) data.neighborhood = group.neighborhood;

  return data;
}

export const DELIVERY_IMPORT_COLUMNS = [
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
] as const;

const DELIVERY_TEMPLATE_EXAMPLE = {
  Cedula: '1234567890',
  NroDispensacion: 'DISP-001234',
  Nombre: 'Juan Carlos Pérez García',
  Telefono: '3001234567',
  Telefono2: '3109876543',
  Telefono3: '',
  Direccion: 'Calle 10 #20-30 Barrio Centro',
  CodigoMedicamento: 'CUM123456',
  Medicamento: 'Acetaminofén 500 mg',
  Cantidad: 2,
  Prioridad: 'MEDIA',
  FechaPendiente: '2026-06-08',
};

export class ExcelImportService {
  generateTemplateBuffer(): Buffer {
    const ws = XLSX.utils.json_to_sheet([DELIVERY_TEMPLATE_EXAMPLE], {
      header: [...DELIVERY_IMPORT_COLUMNS],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Entregas pendientes');

    const instructions = XLSX.utils.aoa_to_sheet([
      ['Instrucciones'],
      ['Nombre', 'Nombre completo del paciente (un solo campo)'],
      ['Telefono / Telefono2 / Telefono3', 'Hasta 3 teléfonos. También puede separar con / en Telefono'],
      ['FechaPendiente', 'Fecha en que se generó el pendiente (no la entrega)'],
      ['Lote', 'No incluir — se registra al empacar en Preparar pendientes'],
      ['HoraEntrega', 'No incluir — se define en llamadas / gestión'],
    ]);
    XLSX.utils.book_append_sheet(wb, instructions, 'Instrucciones');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

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
    const sortedRows = sortImportRows(rows);

    const errors: Array<{ row: number; error: string }> = [];
    const grouped = new Map<string, GroupedDelivery>();

    sortedRows.forEach((row, index) => {
      const rowNum = index + 2;
      try {
        const documentId = getCell(row, 'Cedula', 'cedula');
        const documentNumber = getDispensacionNumber(row);
        const medicationCode =
          getCell(row, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum');
        const medicationName = getCell(row, 'Medicamento', 'medicamento');

        if (!documentId) throw new ValidationError('Cedula is required');
        if (!medicationCode && !medicationName) {
          throw new ValidationError('Medication code or name is required');
        }

        const groupKey = generateHash(documentId, documentNumber || 'NONE');
        const medKey = medicationCode || generateHash(medicationName).slice(0, 8).toUpperCase();
        const rowHash = generateHash(documentId, documentNumber || 'NONE', medKey);

        const quantityRaw = getCell(row, 'Cantidad', 'cantidad') || '1';
        const quantity = Math.max(1, parseInt(String(quantityRaw), 10) || 1);

        const item = {
          medicationCode: medKey,
          medicationName: medicationName || medicationCode,
          quantity,
          rowHash,
        };

        const { firstName, lastName } = parsePatientName(row);
        const phones = parsePhones(row);

        if (grouped.has(groupKey)) {
          const existing = grouped.get(groupKey)!;
          const dupItem = existing.items.find((i) => i.rowHash === rowHash);
          if (dupItem) {
            dupItem.quantity += quantity;
          } else {
            existing.items.push(item);
          }
        } else {
          grouped.set(groupKey, {
            documentId,
            documentNumber,
            firstName,
            lastName,
            phone: phones.phone,
            phoneAlt: phones.phoneAlt,
            phoneFamily: phones.phoneFamily,
            phoneAlternative: phones.phoneAlternative,
            address: getCell(row, 'Direccion', 'direccion') || 'Sin dirección',
            city: getCell(row, 'Ciudad', 'ciudad') || undefined,
            neighborhood: getCell(row, 'Barrio', 'barrio') || undefined,
            priority: parsePriority(getCell(row, 'Prioridad', 'prioridad') || 'MEDIA'),
            pendingGeneratedAt: parsePendingGeneratedDate(row),
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
            const updateData = buildPatientUpdateIfEmpty(patient, group);
            if (Object.keys(updateData).length > 0) {
              patient = await tx.patient.update({
                where: { id: patient.id },
                data: updateData,
              });
            }
          } else {
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
          } else {
            delivery = await tx.delivery.create({
              data: {
                deliveryNumber: generateDeliveryNumber(),
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
            await deliveryStatusService.logStatusChange(tx, {
              deliveryId: delivery.id,
              fromStatus: null,
              toStatus: 'LIBRE',
              action: 'IMPORT_CREATED',
              changedById: importRecord.importedById,
              observations: `Importación ${importRecord.fileName}`,
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
                  cum: item.medicationCode.length >= 6 ? item.medicationCode : undefined,
                },
              });
            }

            const existingItem = await tx.deliveryItem.findFirst({
              where: { uniqueHash: item.rowHash, deletedAt: null },
            });

            if (existingItem) {
              await tx.deliveryItem.update({
                where: { id: existingItem.id },
                data: { quantity: item.quantity },
              });
            } else {
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
        status: 'PENDING',
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
        status: 'PENDING',
        processedRows: 0,
        insertedCount: 0,
        updatedCount: 0,
        errorCount: 0,
        errors: Prisma.DbNull,
        startedAt: null,
        completedAt: null,
      },
    });

    this.processImport(id).catch((err) => logger.error('Excel reprocess failed', { err }));
    return this.getImport(id);
  }
}

export const excelImportService = new ExcelImportService();
