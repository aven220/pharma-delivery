import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeliveryItemHash,
  buildMedicationKey,
} from '../modules/excel-imports/service/excel-import.service';

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
    assert.equal(keyA, 'NAME:ACETAMINOFÉN 500MG');
  });

  it('códigos numéricos largos se distinguen (CUM)', () => {
    const hashA = buildDeliveryItemHash('123', 'DISP-1', '199624601', 'Med A');
    const hashB = buildDeliveryItemHash('123', 'DISP-1', '199624602', 'Med B');
    assert.notEqual(hashA, hashB);
  });
});
