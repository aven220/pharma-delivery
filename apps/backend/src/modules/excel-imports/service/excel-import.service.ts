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
import {
  type ExcelRow,
  type GroupedImportDelivery,
  buildDeliveryItemHash,
  buildMedicationKey,
  fillDownImportRows,
  getCell,
  getDispensacionNumber,
  groupImportRows,
  mapRawExcelRow,
} from './excel-import.rows';

export {
  buildDeliveryItemHash,
  buildMedicationKey,
} from './excel-import.rows';

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

function buildPatientCreateData(group: GroupedImportDelivery) {
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
  group: GroupedImportDelivery
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

function parseExcelSheet(sheet: XLSX.WorkSheet): ExcelRow[] {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    defval: '',
  });
  const mapped = rawRows.map(mapRawExcelRow);
  const filled = fillDownImportRows(mapped);
  return sortImportRows(filled);
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

export class ExcelImportService {
  generateTemplateBuffer(): Buffer {
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
    const sortedRows = parseExcelSheet(sheet);

    const { grouped, errors } = groupImportRows(sortedRows, {
      generateHash,
      parsePatientName,
      parsePhones,
      parsePriority,
      parsePendingGeneratedDate,
      getAddress: (row) => getCell(row, 'Direccion', 'direccion') || 'Sin dirección',
      getCity: (row) => getCell(row, 'Ciudad', 'ciudad') || undefined,
      getNeighborhood: (row) => getCell(row, 'Barrio', 'barrio') || undefined,
      getObservations: (row) => getCell(row, 'Observaciones', 'observaciones') || undefined,
      getPriorityRaw: (row) => getCell(row, 'Prioridad', 'prioridad'),
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
            } else if (medication.name !== item.medicationName) {
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
              } else {
                await tx.deliveryItem.update({
                  where: { id: existingItem.id },
                  data: { quantity: item.quantity },
                });
              }
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

    const status =
      errors.length > 0 && insertedCount + updatedCount === 0
        ? 'FAILED'
        : errors.length > 0
          ? 'PARTIAL'
          : 'COMPLETED';

    await prisma.excelImport.update({
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

    logger.info('Excel import completed', {
      importId,
      insertedCount,
      updatedCount,
      errors: errors.length,
      groups: grouped.size,
    });
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
