import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateHash } from '@pharma/utils';
import {
  buildDeliveryItemHash,
  buildMedicationKey,
  fillDownImportRows,
  groupImportRows,
  mapRawExcelRow,
  type ExcelRow,
} from '../modules/excel-imports/service/excel-import.rows';

const groupDeps = {
  generateHash,
  parsePatientName: (row: ExcelRow) => ({
    firstName: row.Nombre || 'Sin nombre',
    lastName: '.',
  }),
  parsePhones: () => ({ phone: '3001234567' }),
  parsePriority: () => 'MEDIUM' as const,
  parsePendingGeneratedDate: () => undefined,
  getAddress: () => 'Calle 1',
  getCity: () => undefined,
  getNeighborhood: () => undefined,
  getObservations: () => undefined,
  getPriorityRaw: () => 'MEDIA',
};

describe('Excel import — claves por medicamento', () => {
  it('misma cédula y dispensación con códigos distintos generan hashes distintos', () => {
    const hashA = buildDeliveryItemHash('123', 'DISP-001', 'MED-A', 'Acetaminofén');
    const hashB = buildDeliveryItemHash('123', 'DISP-001', 'MED-B', 'Ibuprofeno');
    assert.notEqual(hashA, hashB);
  });

  it('mismo código y dispensación genera el mismo hash (actualiza cantidad)', () => {
    const hashA = buildDeliveryItemHash('123', 'DISP-001', 'MED-A', 'Acetaminofén');
    const hashB = buildDeliveryItemHash('123', 'DISP-001', 'MED-A', 'Acetaminofén 500mg');
    assert.equal(hashA, hashB);
  });

  it('sin código usa nombre completo como clave', () => {
    const keyA = buildMedicationKey('', 'Acetaminofén 500mg');
    const keyB = buildMedicationKey('', 'Ibuprofeno 400mg');
    assert.notEqual(keyA, keyB);
  });
});

describe('Excel import — fill-down y agrupación', () => {
  it('completa cédula/dispensación vacías en filas siguientes', () => {
    const filled = fillDownImportRows([
      {
        Cedula: '123456',
        NroDispensacion: 'DISP-99',
        Nombre: 'Juan Pérez',
        CodigoMedicamento: 'MED-A',
        Medicamento: 'Med A',
        Cantidad: 1,
      },
      {
        CodigoMedicamento: 'MED-B',
        Medicamento: 'Med B',
        Cantidad: 2,
      },
    ]);

    assert.equal(filled.length, 2);
    assert.equal(filled[1].Cedula, '123456');
    assert.equal(filled[1].NroDispensacion, 'DISP-99');
  });

  it('agrupa dos medicamentos en una sola dispensación', () => {
    const filled = fillDownImportRows([
      {
        Cedula: '123456',
        NroDispensacion: 'DISP-99',
        Nombre: 'Juan',
        CodigoMedicamento: 'MED-A',
        Medicamento: 'Med A',
        Cantidad: 1,
      },
      {
        CodigoMedicamento: 'MED-B',
        Medicamento: 'Med B',
        Cantidad: 2,
      },
    ]);

    const { grouped, errors } = groupImportRows(filled, groupDeps);
    assert.equal(errors.length, 0);
    assert.equal(grouped.size, 1);

    const delivery = [...grouped.values()][0];
    assert.equal(delivery.items.length, 2);
    assert.equal(delivery.items[0].medicationCode, 'MED-A');
    assert.equal(delivery.items[1].medicationCode, 'MED-B');
  });

  it('agrupa plantilla real: misma dispensación, distinto CodigoMedicamento', () => {
    const rows = [
      mapRawExcelRow({
        Cedula: '1010091313',
        NombrePaciente: 'MARTHA CECILIA SOTO',
        NroDispensacion: '10020',
        FechaDispensacion: '2024-05-15',
        CodigoMedicamento: '7702133010113',
        NombreMedicamento: 'ACETAMINOFEN 500 MG TABLETA',
        CantidadEntregada: 30,
        Ciudad: 'BOGOTA',
      }),
      mapRawExcelRow({
        Cedula: '1010091313',
        NombrePaciente: 'MARTHA CECILIA SOTO',
        NroDispensacion: '10020',
        FechaDispensacion: '2024-05-15',
        CodigoMedicamento: '7702133010114',
        NombreMedicamento: 'IBUPROFENO 400 MG TABLETA',
        CantidadEntregada: 20,
        Ciudad: 'BOGOTA',
      }),
    ];

    assert.equal(rows[0].Nombre, 'MARTHA CECILIA SOTO');
    assert.equal(rows[0].Medicamento, 'ACETAMINOFEN 500 MG TABLETA');
    assert.equal(rows[0].Cantidad, '30');
    assert.equal(rows[1].CodigoMedicamento, '7702133010114');

    const { grouped, errors } = groupImportRows(rows, groupDeps);
    assert.equal(errors.length, 0);
    assert.equal(grouped.size, 1);
    const delivery = [...grouped.values()][0];
    assert.equal(delivery.items.length, 2);
    assert.equal(delivery.items[0].quantity, 30);
    assert.equal(delivery.items[1].quantity, 20);
  });
});
