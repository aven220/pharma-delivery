import { getDatabase } from './index';

export type LocalEvidenceRecord = {
  id: string;
  deliveryId: string;
  type: string;
  localPath: string | null;
  base64Data: string | null;
  remoteId: string | null;
  synced: boolean;
  createdAt: string;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function getLocalEvidenceByDelivery(deliveryId: string): Promise<LocalEvidenceRecord[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    delivery_id: string;
    type: string;
    local_path: string | null;
    base64_data: string | null;
    remote_id: string | null;
    synced: number;
    created_at: string;
  }>(
    `SELECT id, delivery_id, type, local_path, base64_data, remote_id, synced, created_at
     FROM evidence WHERE delivery_id = ? ORDER BY created_at ASC`,
    deliveryId
  );

  return rows.map((row) => ({
    id: row.id,
    deliveryId: row.delivery_id,
    type: row.type,
    localPath: row.local_path,
    base64Data: row.base64_data,
    remoteId: row.remote_id,
    synced: row.synced === 1,
    createdAt: row.created_at,
  }));
}

export async function saveLocalEvidence(
  deliveryId: string,
  type: 'PHOTO' | 'SIGNATURE',
  options: {
    base64Data?: string | null;
    localPath?: string | null;
    remoteId?: string | null;
    synced?: boolean;
  } = {}
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO evidence (id, delivery_id, type, local_path, base64_data, remote_id, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    id,
    deliveryId,
    type,
    options.localPath ?? null,
    options.base64Data ?? null,
    options.remoteId ?? null,
    options.synced ? 1 : 0
  );
  return id;
}

export async function upsertCachedRemoteEvidence(
  deliveryId: string,
  remoteId: string,
  localPath: string,
  type: 'PHOTO' | 'SIGNATURE' = 'PHOTO'
): Promise<void> {
  const db = await getDatabase();
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM evidence WHERE remote_id = ? LIMIT 1`,
    remoteId
  );

  if (existing) {
    await db.runAsync(
      `UPDATE evidence SET local_path = ?, synced = 1 WHERE id = ?`,
      localPath,
      existing.id
    );
    return;
  }

  await db.runAsync(
    `INSERT INTO evidence (id, delivery_id, type, local_path, remote_id, synced)
     VALUES (?, ?, ?, ?, ?, 1)`,
    generateId(),
    deliveryId,
    type,
    localPath,
    remoteId
  );
}

export async function markLocalEvidenceSynced(localId: string, remoteId?: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE evidence SET synced = 1, remote_id = COALESCE(?, remote_id) WHERE id = ?`,
    remoteId ?? null,
    localId
  );
}

export async function countLocalPhotos(deliveryId: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM evidence WHERE delivery_id = ? AND type = 'PHOTO'`,
    deliveryId
  );
  return row?.count ?? 0;
}
