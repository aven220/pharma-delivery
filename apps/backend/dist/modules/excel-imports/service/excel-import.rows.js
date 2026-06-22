"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeExcelCell = normalizeExcelCell;
exports.normalizeHeaderKey = normalizeHeaderKey;
exports.mapRawExcelRow = mapRawExcelRow;
exports.getCell = getCell;
exports.getDispensacionNumber = getDispensacionNumber;
exports.isBlankImportRow = isBlankImportRow;
exports.fillDownImportRows = fillDownImportRows;
exports.parseExcelSheetMatrix = parseExcelSheetMatrix;
exports.buildMedicationKey = buildMedicationKey;
exports.buildDeliveryItemHash = buildDeliveryItemHash;
exports.groupImportRows = groupImportRows;
const utils_1 = require("@pharma/utils");
const HEADER_ALIASES = {
    cedula: 'Cedula',
    documento: 'Cedula',
    numeroidentificacion: 'Cedula',
    identificacion: 'Cedula',
    numerodocumento: 'Cedula',
    cedulapaciente: 'Cedula',
    nrodispensacion: 'NroDispensacion',
    numerodispensacion: 'NroDispensacion',
    numerodisp: 'NroDispensacion',
    nodisp: 'NroDispensacion',
    dispensacion: 'NroDispensacion',
    nodispensacion: 'NroDispensacion',
    coddispensa: 'NroDispensacion',
    codigodispensa: 'NroDispensacion',
    coddisp: 'NroDispensacion',
    nrodisp: 'NroDispensacion',
    nrodocumento: 'NroDocumento',
    nombre: 'Nombre',
    nombrecompleto: 'Nombre',
    nombrepaciente: 'Nombre',
    paciente: 'Nombre',
    telefono: 'Telefono',
    telefono1: 'Telefono',
    telefono2: 'Telefono2',
    telefono3: 'Telefono3',
    telefonoalt: 'TelefonoAlt',
    direccion: 'Direccion',
    ciudad: 'Ciudad',
    barrio: 'Barrio',
    codigomedicamento: 'CodigoMedicamento',
    codmedicamento: 'CodigoMedicamento',
    codigocum: 'CodigoMedicamento',
    codigoproducto: 'CodigoMedicamento',
    codigo: 'CodigoMedicamento',
    codproducto: 'CodigoMedicamento',
    cum: 'CUM',
    medicamento: 'Medicamento',
    nombremedicamento: 'Medicamento',
    producto: 'Medicamento',
    descripcion: 'Medicamento',
    cantidad: 'Cantidad',
    cantidadentregada: 'Cantidad',
    cantidaddispensada: 'Cantidad',
    qty: 'Cantidad',
    prioridad: 'Prioridad',
    fechapendiente: 'FechaPendiente',
    fechadispensacion: 'FechaPendiente',
    fecha: 'FechaPendiente',
    fechaentrega: 'FechaEntrega',
    observaciones: 'Observaciones',
    observacion: 'Observaciones',
    nombrepunto: 'Observaciones',
    puntoentrega: 'Observaciones',
};
function normalizeExcelCell(val) {
    if (val === undefined || val === null)
        return '';
    if (typeof val === 'number') {
        if (!Number.isFinite(val))
            return '';
        if (Number.isInteger(val))
            return String(val);
        const asInt = Math.trunc(val);
        if (Math.abs(val - asInt) < 1e-9)
            return String(asInt);
        return String(val);
    }
    return String(val).trim();
}
function normalizeHeaderKey(key) {
    return key
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
}
function mapRawExcelRow(raw) {
    const mapped = {};
    for (const [key, value] of Object.entries(raw)) {
        const alias = HEADER_ALIASES[normalizeHeaderKey(key)];
        if (!alias)
            continue;
        const cell = normalizeExcelCell(value);
        if (!cell)
            continue;
        // No sobrescribir un valor ya mapeado con uno vacío de otra columna alias
        if (!mapped[alias] || cell) {
            mapped[alias] = cell;
        }
    }
    // CUM explícito como código si CodigoMedicamento vino vacío
    if (!mapped.CodigoMedicamento && mapped.CUM) {
        mapped.CodigoMedicamento = mapped.CUM;
    }
    return mapped;
}
function getCell(row, ...keys) {
    for (const key of keys) {
        const val = normalizeExcelCell(row[key]);
        if (val)
            return val;
    }
    return '';
}
function getDispensacionNumber(row) {
    return getCell(row, 'NroDispensacion', 'nroDispensacion', 'Dispensacion', 'dispensacion', 'NroDocumento', 'nroDocumento');
}
function isBlankImportRow(row) {
    return (!getCell(row, 'Cedula', 'cedula') &&
        !getDispensacionNumber(row) &&
        !getCell(row, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum') &&
        !getCell(row, 'Medicamento', 'medicamento'));
}
/** Rellena cédula/dispensación vacías con la fila anterior (Excel con celdas combinadas). */
function fillDownImportRows(rows) {
    const filled = [];
    let last = {};
    for (const row of rows) {
        if (isBlankImportRow(row))
            continue;
        const merged = { ...row };
        if (!getCell(merged, 'Cedula', 'cedula') && getCell(last, 'Cedula', 'cedula')) {
            merged.Cedula = getCell(last, 'Cedula', 'cedula');
        }
        if (!getDispensacionNumber(merged) && getDispensacionNumber(last)) {
            merged.NroDispensacion = getDispensacionNumber(last);
        }
        if (!getCell(merged, 'Nombre', 'nombre') && getCell(last, 'Nombre', 'nombre')) {
            merged.Nombre = getCell(last, 'Nombre', 'nombre');
        }
        if (!getCell(merged, 'Telefono', 'telefono') && getCell(last, 'Telefono', 'telefono')) {
            merged.Telefono = getCell(last, 'Telefono', 'telefono');
        }
        if (!getCell(merged, 'Direccion', 'direccion') && getCell(last, 'Direccion', 'direccion')) {
            merged.Direccion = getCell(last, 'Direccion', 'direccion');
        }
        filled.push(merged);
        if (getCell(merged, 'Cedula', 'cedula')) {
            last = merged;
        }
    }
    return filled;
}
/** Detecta fila de encabezados (aunque no sea la fila 1) y parsea datos. */
function parseExcelSheetMatrix(matrix) {
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(matrix.length, 15); i++) {
        const row = matrix[i];
        if (!Array.isArray(row))
            continue;
        const keys = row.map((c) => normalizeHeaderKey(String(c ?? '')));
        const hasPatient = keys.some((k) => ['cedula', 'nombrepaciente', 'nombrecompleto', 'numeroidentificacion'].includes(k));
        const hasMed = keys.some((k) => ['codigomedicamento', 'nombremedicamento', 'codmedicamento', 'cum', 'codigocum'].includes(k));
        const hasDisp = keys.some((k) => ['nrodispensacion', 'coddispensa', 'codigodispensa', 'dispensacion'].includes(k));
        if (hasPatient && (hasMed || hasDisp)) {
            headerRowIdx = i;
            break;
        }
    }
    const headers = (matrix[headerRowIdx] ?? []).map((h) => String(h ?? '').trim());
    const mapped = [];
    for (const row of matrix.slice(headerRowIdx + 1)) {
        if (!Array.isArray(row))
            continue;
        const raw = {};
        headers.forEach((header, idx) => {
            if (header)
                raw[header] = row[idx];
        });
        const excelRow = mapRawExcelRow(raw);
        if (!isBlankImportRow(excelRow))
            mapped.push(excelRow);
    }
    return mapped;
}
function buildMedicationKey(medicationCode, medicationName) {
    const code = medicationCode.trim().toUpperCase();
    const name = medicationName.trim().toUpperCase();
    if (code)
        return code;
    if (name)
        return `NAME:${name}`;
    return 'UNKNOWN-MED';
}
function buildDeliveryItemHash(documentId, documentNumber, medicationCode, medicationName) {
    const medKey = buildMedicationKey(medicationCode, medicationName);
    return (0, utils_1.generateHash)(documentId, documentNumber || 'NONE', medKey);
}
function groupImportRows(rows, deps) {
    const grouped = new Map();
    const errors = [];
    rows.forEach((row, index) => {
        const rowNum = index + 2;
        try {
            const documentId = getCell(row, 'Cedula', 'cedula');
            const documentNumber = getDispensacionNumber(row);
            const medicationCode = getCell(row, 'CodigoMedicamento', 'codigoMedicamento', 'CUM', 'cum');
            const medicationName = getCell(row, 'Medicamento', 'medicamento');
            if (!documentId)
                throw new Error('Cedula is required');
            if (!medicationCode && !medicationName) {
                throw new Error('Medication code or name is required');
            }
            const groupKey = deps.generateHash(documentId, documentNumber || 'NONE');
            const rowHash = buildDeliveryItemHash(documentId, documentNumber, medicationCode, medicationName);
            const quantityRaw = getCell(row, 'Cantidad', 'cantidad') || '1';
            const quantity = Math.max(1, parseInt(String(quantityRaw), 10) || 1);
            const item = {
                medicationCode: medicationCode || buildMedicationKey('', medicationName),
                medicationName: medicationName || medicationCode,
                quantity,
                rowHash,
            };
            const { firstName, lastName } = deps.parsePatientName(row);
            const phones = deps.parsePhones(row);
            if (grouped.has(groupKey)) {
                const existing = grouped.get(groupKey);
                const dupItem = existing.items.find((i) => i.rowHash === rowHash);
                if (dupItem) {
                    dupItem.quantity += quantity;
                }
                else {
                    existing.items.push(item);
                }
            }
            else {
                grouped.set(groupKey, {
                    documentId,
                    documentNumber,
                    firstName,
                    lastName,
                    phone: phones.phone,
                    phoneAlt: phones.phoneAlt,
                    phoneFamily: phones.phoneFamily,
                    phoneAlternative: phones.phoneAlternative,
                    address: deps.getAddress(row),
                    city: deps.getCity(row),
                    neighborhood: deps.getNeighborhood(row),
                    priority: deps.parsePriority(deps.getPriorityRaw(row) || 'MEDIA'),
                    pendingGeneratedAt: deps.parsePendingGeneratedDate(row),
                    observations: deps.getObservations(row),
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
    return { grouped, errors };
}
