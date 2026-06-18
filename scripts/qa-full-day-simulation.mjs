#!/usr/bin/env node
/**
 * Simulación QA — día operativo completo A-AS Delivery
 * Ejecutar: node scripts/qa-full-day-simulation.mjs
 */
import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.QA_API_URL || 'http://localhost:4000';
const results = [];
const timings = [];

function log(icon, msg, detail) {
  const line = { icon, msg, detail, ts: new Date().toISOString() };
  results.push(line);
  console.log(`${icon} ${msg}${detail ? ` — ${JSON.stringify(detail)}` : ''}`);
}

function pass(msg, detail) { log('✅', msg, detail); }
function fail(msg, detail) { log('❌', msg, detail); }
function warn(msg, detail) { log('⚠️', msg, detail); }
function info(msg, detail) { log('ℹ️', msg, detail); }

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const out = await fn();
    timings.push({ label, ms: Date.now() - t0, ok: true });
    return out;
  } catch (e) {
    timings.push({ label, ms: Date.now() - t0, ok: false, error: String(e.message || e) });
    throw e;
  }
}

async function api(method, path, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let reqBody;
  if (formData) {
    reqBody = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: reqBody });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text.slice(0, 200) }; }
  if (!res.ok) {
    const err = new Error(`${method} ${path} → ${res.status}: ${json?.message || json?.error || text.slice(0, 120)}`);
    err.status = res.status;
    err.body = json;
    throw err;
  }
  return json;
}

async function login(email, password) {
  const res = await api('POST', '/api/auth/login', { body: { email, password } });
  const tokens = res.data.tokens || res.data;
  return {
    token: tokens.accessToken,
    refresh: tokens.refreshToken,
    user: res.data.user,
  };
}

function buildTestExcel(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function makeRow(i, opts = {}) {
  const cedula = opts.cedula || `100${String(i).padStart(6, '0')}`;
  const nro = opts.nro || `DISP-${String(i).padStart(4, '0')}`;
  return {
    Cedula: cedula,
    NroDispensacion: nro,
    Nombre: opts.nombre || `Paciente QA ${i}`,
    Telefono: opts.phone || `300${String(1000000 + i).slice(-7)}`,
    Telefono2: '',
    Telefono3: '',
    Direccion: `Calle ${i} # ${i}-${i}`,
    CodigoMedicamento: opts.medCode || 'MED-001',
    Medicamento: opts.medName || 'Acetaminofén 500mg',
    Cantidad: opts.qty || 1,
    Prioridad: opts.priority || 'NORMAL',
    FechaPendiente: opts.fecha || '2026-06-08',
  };
}

async function main() {
  console.log('\n========== QA SIMULACIÓN DÍA COMPLETO ==========\n');
  console.log(`API: ${BASE}\n`);

  const state = {
    supervisor: null,
    operator: null,
    operator2: null,
    courier: null,
    admin: null,
    auditor: null,
    deliveryIds: [],
    assignmentIds: [],
    operatorUserId: null,
    courierUserId: null,
  };

  // ── FASE 0: Salud del sistema ──
  try {
    const health = await timed('health', () => api('GET', '/health'));
    pass('Health check', { status: health?.status || health?.data?.status });
  } catch (e) {
    fail('Health check — backend no responde', { error: e.message });
    console.error('\n❌ Abortando: levante postgres, redis y backend primero.\n');
    process.exit(1);
  }

  try {
    const ready = await api('GET', '/ready');
    pass('Readiness (DB + Redis)', ready?.data || ready);
  } catch (e) {
    fail('Readiness', { error: e.message });
  }

  // ── FASE 1: Login multi-usuario ──
  const users = [
    ['admin', 'admin@pharma.local', 'Admin123!'],
    ['supervisor', 'supervisor@pharma.local', 'Supervisor123!'],
    ['operator', 'operator@pharma.local', 'Operator123!'],
    ['courier', 'courier@pharma.local', 'Courier123!'],
    ['auditor', 'auditor@pharma.local', 'Auditor123!'],
  ];

  for (const [key, email, password] of users) {
    try {
      state[key] = await timed(`login:${key}`, () => login(email, password));
      pass(`Login ${key}`, { email, role: state[key].user?.role?.name || state[key].user?.role });
    } catch (e) {
      fail(`Login ${key}`, { email, error: e.message });
    }
  }

  // Login concurrente (simula inicio de jornada)
  try {
    const concurrent = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        login(i % 2 === 0 ? 'supervisor@pharma.local' : 'operator@pharma.local', i % 2 === 0 ? 'Supervisor123!' : 'Operator123!')
      )
    );
    const ok = concurrent.filter((r) => r.status === 'fulfilled').length;
    if (ok === 10) pass('10 logins concurrentes', { ok: 10 });
    else warn('Logins concurrentes parciales', { ok, fail: 10 - ok });
  } catch (e) {
    fail('Logins concurrentes', { error: e.message });
  }

  if (!state.supervisor?.token) {
    fail('Sin supervisor — no se puede continuar flujo operativo');
    printSummary();
    process.exit(1);
  }

  const sup = state.supervisor.token;
  const op = state.operator?.token;
  const cour = state.courier?.token;
  const adm = state.admin?.token;

  if (adm) {
    try {
      const dh = await api('GET', '/api/system/data-health', { token: adm });
      pass('Salud de datos (data-health)', {
        status: dh.data?.status,
        dbSize: dh.data?.database?.size,
        pendingLibre: dh.data?.database?.pendingLibre,
        retentionDays: dh.data?.backup?.retentionDays,
      });
    } catch (e) {
      fail('Data-health', { error: e.message });
    }
  }

  // ── FASE 2: Importación Excel masiva (mañana) ──
  info('--- FASE 2: Importación Excel (50 entregas) ---');
  const excelRows = [];
  for (let i = 1; i <= 45; i++) excelRows.push(makeRow(i));
  // Duplicados misma dispensación → deben agruparse
  excelRows.push(makeRow(46, { cedula: '100000046', nro: 'DISP-MULTI', medCode: 'MED-001', qty: 2 }));
  excelRows.push(makeRow(47, { cedula: '100000046', nro: 'DISP-MULTI', medCode: 'MED-001', qty: 3 }));
  excelRows.push(makeRow(48, { cedula: '100000048', nro: 'DISP-0048', medCode: 'MED-002', qty: 1 }));
  excelRows.push(makeRow(49, { cedula: '100000049', nro: 'DISP-0049', priority: 'URGENTE' }));
  excelRows.push(makeRow(50, { cedula: '100000050', nro: 'DISP-0050' }));

  try {
    const buf = buildTestExcel(excelRows);
    const fd = new FormData();
    fd.append('file', new Blob([buf]), 'qa-dia-completo.xlsx');
    const importRes = await timed('excel-upload', () =>
      api('POST', '/api/excel-imports/upload', { token: sup, formData: fd })
    );
    pass('Importación Excel 50 filas', {
      importId: importRes.data?.id,
      status: importRes.data?.status,
      processed: importRes.data?.processedRows,
      errors: importRes.data?.errorRows,
    });
    if (importRes.data?.id) {
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 500));
        const imp = await api('GET', `/api/excel-imports/${importRes.data.id}`, { token: sup });
        if (['COMPLETED', 'PARTIAL', 'FAILED'].includes(imp.data?.status)) {
          pass('Importación Excel procesada', { status: imp.data.status, processed: imp.data.processedRows });
          break;
        }
        if (i === 19) warn('Importación Excel aún en proceso', { status: imp.data?.status });
      }
    }
  } catch (e) {
    fail('Importación Excel', { error: e.message, body: e.body });
  }

  // ── FASE 3: Preparar pendientes ──
  info('--- FASE 3: Preparar pendientes ---');
  let libres = [];
  try {
    const summary = await timed('pending-prep-summary', () =>
      api('GET', '/api/pending-prep/summary', { token: sup })
    );
    const summaryBytes = JSON.stringify(summary.data).length;
    pass('Resumen preparación pendientes', {
      libre: summary.data?.byStatus?.find((s) => s.status === 'LIBRE')?.count,
      totalCedulas: summary.data?.totalCedulas,
      cedulaRows: summary.data?.byCedula?.length,
      payloadBytes: summaryBytes,
    });
    if (summaryBytes > 100_000) warn('Summary payload grande', { summaryBytes });
    else pass('Summary payload acotado (<100KB)', { summaryBytes });
    const list = await api('GET', '/api/pending-prep?status=LIBRE&limit=100', { token: sup });
    libres = list.data || [];
    pass(`Listado LIBRE (${libres.length} entregas)`, { total: list.meta?.total });
  } catch (e) {
    fail('Listar pendientes LIBRE', { error: e.message });
  }

  const toPack = libres.slice(0, 30);
  const toReject = libres.slice(30, 35);
  let packed = 0;
  let rejected = 0;

  for (const d of toPack) {
    try {
      await api('POST', `/api/pending-prep/${d.id}/pack`, {
        token: sup,
        body: { observations: 'QA empacado', patientUpdates: { phone: d.patient?.phone || '3001112233' } },
      });
      packed++;
      state.deliveryIds.push(d.id);
    } catch (e) {
      fail(`Empacar ${d.deliveryNumber}`, { error: e.message });
    }
  }
  pass(`Empacados ${packed}/${toPack.length}`);

  for (const d of toReject) {
    try {
      await api('POST', `/api/pending-prep/${d.id}/reject`, {
        token: sup,
        body: { observations: 'QA rechazo — sin stock' },
      });
      rejected++;
    } catch (e) {
      fail(`Rechazar ${d.deliveryNumber}`, { error: e.message });
    }
  }
  pass(`Rechazados ${rejected}/${toReject.length}`);

  // Operador también puede preparar (permiso deliveries.write)
  if (op && libres[35]) {
    try {
      await api('POST', `/api/pending-prep/${libres[35].id}/pack`, { token: op, body: {} });
      pass('Operador puede empacar (permiso deliveries.write)');
      state.deliveryIds.push(libres[35].id);
    } catch (e) {
      warn('Operador empacar', { error: e.message });
    }
  }

  // ── FASE 4: Asignación llamadas ──
  info('--- FASE 4: Llamadas — asignación ---');
  try {
    const operators = await api('GET', '/api/calls/operators', { token: sup });
    state.operatorUserId = operators.data?.[0]?.id;
    pass('Listar operadores con carga', {
      count: operators.data?.length,
      operatorId: state.operatorUserId,
      loads: (operators.data || []).map((o) => ({ name: o.firstName, pending: o.pendingCalls })),
    });
  } catch (e) {
    fail('Listar operadores', { error: e.message });
  }

  let pendingCalls = [];
  try {
    const pending = await api('GET', '/api/calls/pending?limit=100', { token: sup });
    pendingCalls = pending.data || [];
    pass(`Cola pendientes llamada (${pendingCalls.length})`);
  } catch (e) {
    fail('Cola pendientes llamada', { error: e.message });
  }

  const assignBatch1 = pendingCalls.slice(0, 15).map((p) => p.deliveryId || p.id);
  const assignBatch2 = pendingCalls.slice(15, 25).map((p) => p.deliveryId || p.id);

  if (state.operatorUserId && assignBatch1.length) {
    try {
      const assigned = await timed('assign-calls-15', () =>
        api('POST', '/api/calls/assign', {
          token: sup,
          body: { deliveryIds: assignBatch1, operatorUserId: state.operatorUserId },
        })
      );
      pass('Asignar 15 llamadas a operador', { count: assigned.data?.length });
    } catch (e) {
      fail('Asignar llamadas batch 1', { error: e.message });
    }
  }

  // Notificaciones operador
  if (op) {
    try {
      const unread = await api('GET', '/api/notifications/unread-count', { token: op });
      pass('Notificación operador (campana)', { unread: unread.data?.count });
      if (unread.data?.count === 0) warn('Operador sin notificaciones tras asignación');
    } catch (e) {
      fail('Notificaciones operador', { error: e.message });
    }
  }

  // ── FASE 5: Operador gestiona llamadas ──
  info('--- FASE 5: Operador — Mis llamadas ---');
  if (op) {
    try {
      const myCalls = await api('GET', '/api/calls/my?limit=100', { token: op });
      const calls = myCalls.data || [];
      pass(`Mis llamadas operador (${calls.length})`, { total: myCalls.meta?.total });

      let confirmed = 0;
      let rescheduled = 0;
      let pending = 0;

      for (let i = 0; i < Math.min(calls.length, 12); i++) {
        const c = calls[i];
        let body;
        if (i % 4 === 0) {
          body = {
            status: 'RESCHEDULE',
            managementResult: 'RESCHEDULE',
            observations: `QA reagendar ${i + 1}`,
            callDate: '2026-06-08',
            callTime: '10:30',
            phoneUsed: c.delivery?.patient?.phone || '3001234567',
            rescheduleDate: '2026-06-10',
            rescheduleTime: '14:00',
          };
          rescheduled++;
        } else if (i % 3 === 0) {
          body = {
            status: 'NO_ANSWER',
            managementResult: 'NOT_LOCATED',
            observations: `QA no contesta ${i + 1}`,
            callDate: '2026-06-08',
            callTime: '10:30',
            phoneUsed: c.delivery?.patient?.phone || '3001234567',
          };
          pending++;
        } else {
          body = {
            status: 'CONFIRMED',
            managementResult: 'CONFIRMED_FOR_DELIVERY',
            observations: `QA confirmado ${i + 1}`,
            callDate: '2026-06-08',
            callTime: '10:30',
            phoneUsed: c.delivery?.patient?.phone || '3001234567',
          };
          confirmed++;
        }
        try {
          await api('PATCH', `/api/calls/my/${c.id}`, { token: op, body });
          state.assignmentIds.push(c.id);
        } catch (e) {
          fail(`Gestionar llamada ${c.id}`, { error: e.message });
        }
      }
      pass('Gestión llamadas operador', { confirmed, rescheduled, pending });
    } catch (e) {
      fail('Mis llamadas operador', { error: e.message });
    }
  }

  // Segunda tanda asignación
  if (state.operatorUserId && assignBatch2.length) {
    try {
      await api('POST', '/api/calls/assign', {
        token: sup,
        body: { deliveryIds: assignBatch2, operatorUserId: state.operatorUserId },
      });
      pass('Segunda tanda asignación (10 llamadas)');
    } catch (e) {
      warn('Segunda tanda asignación', { error: e.message });
    }
  }

  // ── FASE 6: Asignación domiciliarios ──
  info('--- FASE 6: Asignación domiciliarios ---');
  try {
    const couriers = await api('GET', '/api/assignments/couriers', { token: sup });
    state.courierUserId = couriers.data?.[0]?.userId || couriers.data?.[0]?.id;
    pass('Listar domiciliarios', { count: couriers.data?.length });
  } catch (e) {
    fail('Listar domiciliarios', { error: e.message });
  }

  let confirmedDeliveries = [];
  try {
    const [confirmed, scheduled] = await Promise.all([
      api('GET', '/api/deliveries?limit=50&status=CONFIRMED_FOR_DELIVERY', { token: sup }),
      api('GET', '/api/deliveries?limit=50&status=SCHEDULED', { token: sup }),
    ]);
    confirmedDeliveries = [...(confirmed.data || []), ...(scheduled.data || [])];
    pass('Entregas asignables a domiciliario', { count: confirmedDeliveries.length });
  } catch (e) {
    fail('Buscar entregas confirmadas', { error: e.message });
  }

  if (state.courierUserId && confirmedDeliveries.length) {
    const assignIds = confirmedDeliveries.slice(0, 8).map((d) => d.id);
    try {
      const a = await api('POST', '/api/assignments', {
        token: sup,
        body: { deliveryIds: assignIds, courierId: state.courierUserId },
      });
      pass('Asignar entregas a domiciliario', { count: a.data?.length });
    } catch (e) {
      warn('Asignación domiciliario', { error: e.message, hint: 'Puede requerir estado CALL_COMPLETED previo' });
    }
  }

  // ── FASE 7: App móvil (domiciliario) ──
  info('--- FASE 7: Domiciliario — app móvil API ---');
  if (cour) {
    try {
      const myDel = await api('GET', '/api/deliveries/my', { token: cour });
      pass('Domiciliario — mis entregas', { count: myDel.data?.length ?? myDel.meta?.total });
    } catch (e) {
      fail('Domiciliario mis entregas', { error: e.message });
    }

    try {
      const notif = await api('GET', '/api/notifications/unread-count', { token: cour });
      pass('Notificaciones domiciliario', { unread: notif.data?.count });
    } catch (e) {
      warn('Notificaciones domiciliario', { error: e.message });
    }
  }

  // Auditor solo lectura
  if (state.auditor?.token) {
    try {
      await api('GET', '/api/deliveries?limit=5', { token: state.auditor.token });
      pass('Auditor puede leer entregas');
    } catch (e) {
      fail('Auditor lectura', { error: e.message });
    }
    try {
      await api('POST', '/api/calls/assign', {
        token: state.auditor.token,
        body: { deliveryIds: ['fake'], operatorUserId: 'fake' },
      });
      fail('Auditor NO debería asignar llamadas');
    } catch (e) {
      if (e.status === 403 || e.status === 401) pass('Auditor bloqueado en asignación (RBAC OK)');
      else warn('Auditor asignación', { status: e.status });
    }
  }

  // ── FASE 8: Reportes y dashboard ──
  info('--- FASE 8: Reportes / dashboard ---');
  try {
    const dash = await api('GET', '/api/dashboard/stats', { token: sup });
    pass('Dashboard stats', { keys: Object.keys(dash.data || {}) });
  } catch (e) {
    warn('Dashboard', { error: e.message });
  }

  try {
    const stats = await api('GET', '/api/calls/management-stats', { token: sup });
    pass('Estadísticas gestión llamadas', stats.data);
  } catch (e) {
    warn('Stats llamadas', { error: e.message });
  }

  // ── FASE 9: Carga concurrente ──
  info('--- FASE 9: Prueba de carga (30 peticiones paralelas) ---');
  const loadStart = Date.now();
  const loadResults = await Promise.allSettled(
    Array.from({ length: 30 }, (_, i) =>
      api('GET', `/api/deliveries?limit=10&page=${(i % 5) + 1}`, { token: sup })
    )
  );
  const loadOk = loadResults.filter((r) => r.status === 'fulfilled').length;
  const loadMs = Date.now() - loadStart;
  if (loadOk >= 28) pass('Carga 30 requests paralelos', { ok: loadOk, ms: loadMs, rps: (loadOk / (loadMs / 1000)).toFixed(1) });
  else warn('Carga parcial', { ok: loadOk, ms: loadMs });

  // Rate limit login
  try {
    const burst = await Promise.allSettled(
      Array.from({ length: 15 }, () => login('admin@pharma.local', 'wrong-password'))
    );
    const rateLimited = burst.filter((r) => r.status === 'rejected' && r.reason?.status === 429).length;
    if (rateLimited > 0) pass('Rate limit login activo', { blocked: rateLimited });
    else info('Rate limit login', { note: 'No se activó en 15 intentos (umbral alto)' });
  } catch (_) { /* ignore */ }

  printSummary();
}

function printSummary() {
  const passed = results.filter((r) => r.icon === '✅').length;
  const failed = results.filter((r) => r.icon === '❌').length;
  const warnings = results.filter((r) => r.icon === '⚠️').length;

  console.log('\n========== RESUMEN QA ==========');
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log(`⚠️  Advertencias: ${warnings}`);

  const slow = timings.filter((t) => t.ms > 2000).sort((a, b) => b.ms - a.ms);
  if (slow.length) {
    console.log('\nOperaciones lentas (>2s):');
    slow.slice(0, 5).forEach((t) => console.log(`  ${t.label}: ${t.ms}ms`));
  }

  const reportPath = join(__dirname, 'qa-report.json');
  writeFileSync(reportPath, JSON.stringify({ results, timings, summary: { passed, failed, warnings } }, null, 2));
  console.log(`\nReporte JSON: ${reportPath}\n`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
