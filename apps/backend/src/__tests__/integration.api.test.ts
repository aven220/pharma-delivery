import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.QA_API_URL || 'http://localhost:4000';

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `login ${email}`);
  const json = (await res.json()) as { data: { tokens: { accessToken: string } } };
  return json.data.tokens.accessToken;
}

describe('A-AS Delivery — integración API', () => {
  it('health responde ok', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as { status: string };
    assert.equal(json.status, 'ok');
  });

  it('pending-prep summary acotado (no payload gigante)', async () => {
    const token = await login('supervisor@pharma.local', 'Supervisor123!');
    const res = await fetch(`${BASE}/api/pending-prep/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const json = (await res.json()) as { data: { byCedula: unknown[]; totalCedulas: number } };
    const data = json.data;
    assert.ok(Array.isArray(data.byCedula));
    assert.ok(data.byCedula.length <= 50, 'byCedula debe estar limitado a 50');
    assert.ok(typeof data.totalCedulas === 'number');
    const body = JSON.stringify(data);
    assert.ok(body.length < 100_000, `summary demasiado grande: ${body.length} bytes`);
  });

  it('operadores incluyen carga de trabajo', async () => {
    const token = await login('supervisor@pharma.local', 'Supervisor123!');
    const res = await fetch(`${BASE}/api/calls/operators`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const ops = ((await res.json()) as { data: Array<{ pendingCalls?: number }> }).data;
    assert.ok(Array.isArray(ops));
    if (ops.length > 0) {
      assert.ok(typeof ops[0].pendingCalls === 'number');
    }
  });

  it('data-health expone estado de datos', async () => {
    const token = await login('admin@pharma.local', 'Admin123!');
    const res = await fetch(`${BASE}/api/system/data-health`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = ((await res.json()) as {
      data: { database: { connected: boolean; deliveriesByStatus: unknown[] }; backup: { retentionDays: number } };
    }).data;
    assert.ok(data.database?.connected);
    assert.ok(Array.isArray(data.database.deliveriesByStatus));
    assert.ok(data.backup?.retentionDays >= 1);
  });

  it('auditor no puede asignar llamadas', async () => {
    const token = await login('auditor@pharma.local', 'Auditor123!');
    const res = await fetch(`${BASE}/api/calls/assign`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ deliveryIds: ['invalid'], operatorUserId: 'invalid' }),
    });
    assert.ok(res.status === 403 || res.status === 401 || res.status === 400);
  });
});
