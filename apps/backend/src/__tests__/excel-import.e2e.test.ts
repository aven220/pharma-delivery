import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../infra/database/prisma';
import { excelImportService } from '../modules/excel-imports/service/excel-import.service';
import { env } from '../config/env';

const PLANTILLA_ROWS = [
  {
    Cedula: '1010091313',
    NombrePaciente: 'MARTHA CECILIA SOTO',
    NroDispensacion: '10020',
    FechaDispensacion: '2024-05-15',
    CodigoMedicamento: '7702133010113',
    NombreMedicamento: 'ACETAMINOFEN 500 MG TABLETA',
    CantidadEntregada: 30,
    ValorTotal: 4500,
    NombrePunto: 'DROGUERIA CENTRAL',
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
    ValorTotal: 3000,
    NombrePunto: 'DROGUERIA CENTRAL',
    Ciudad: 'BOGOTA',
  },
];

describe('Excel import E2E — plantilla real', () => {
  let importId: string;
  let filePath: string;
  let adminId: string;

  before(async () => {
    const admin = await prisma.user.findFirst({
      where: { email: 'admin@pharma.local', deletedAt: null },
    });
    assert.ok(admin, 'Seed admin requerido — ejecute npm run db:seed');
    adminId = admin.id;

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(PLANTILLA_ROWS);
    XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    const rel = `excel/e2e-${Date.now()}.xlsx`;
    filePath = rel;
    const abs = path.join(env.UPLOAD_DIR, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, buffer);

    const record = await excelImportService.createImport(adminId, 'e2e-plantilla.xlsx', rel);
    importId = record.id;
    await excelImportService.processImport(importId);
  });

  after(async () => {
    if (importId) {
      await prisma.excelImport.delete({ where: { id: importId } }).catch(() => {});
    }
  });

  it('importación COMPLETED con 0 errores', async () => {
    const imp = await prisma.excelImport.findUnique({ where: { id: importId } });
    assert.equal(imp?.status, 'COMPLETED', JSON.stringify(imp?.errors));
    assert.equal(imp?.errorCount, 0);
  });

  it('una dispensación con exactamente 2 medicamentos', async () => {
    const delivery = await prisma.delivery.findFirst({
      where: {
        documentNumber: '10020',
        deletedAt: null,
        patient: { documentId: '1010091313' },
      },
      include: {
        items: {
          where: { deletedAt: null },
          include: { medication: true },
          orderBy: { medication: { code: 'asc' } },
        },
      },
    });

    assert.ok(delivery, 'Debe existir entrega dispensación 10020');
    assert.equal(
      delivery.items.length,
      2,
      `Esperados 2 ítems, hay ${delivery.items.length}: ${delivery.items.map((i) => i.medication.code).join(', ')}`
    );

    const codes = delivery.items.map((i) => i.medication.code).sort();
    assert.deepEqual(codes, ['7702133010113', '7702133010114']);
  });
});
