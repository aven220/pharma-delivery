import { getDatabase } from '../database';
import { saveLocalEvidence as persistLocalEvidence } from '../database/evidence.repo';
import type { OfflineQueueItem } from '@pharma/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function enqueueSyncItem(
  type: OfflineQueueItem['type'],
  payload: Record<string, unknown>
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO sync_queue (id, type, payload, status) VALUES (?, ?, ?, 'PENDING')`,
    id,
    type,
    JSON.stringify(payload)
  );
  return id;
}

export async function getPendingSyncItems(): Promise<OfflineQueueItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string;
    type: OfflineQueueItem['type'];
    payload: string;
    retries: number;
    created_at: string;
  }>(
    `SELECT id, type, payload, retries, created_at FROM sync_queue
     WHERE status IN ('PENDING', 'FAILED') AND retries < max_retries
     ORDER BY created_at ASC`
  );

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    payload: JSON.parse(r.payload),
    retries: r.retries,
    createdAt: r.created_at,
  }));
}

export async function markSyncItemCompleted(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`UPDATE sync_queue SET status = 'COMPLETED', updated_at = datetime('now') WHERE id = ?`, id);
}

export async function markSyncItemFailed(id: string, error: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sync_queue SET status = 'FAILED', retries = retries + 1, error = ?, updated_at = datetime('now') WHERE id = ?`,
    error,
    id
  );
}

export async function saveLocalEvidence(
  deliveryId: string,
  type: 'PHOTO' | 'SIGNATURE',
  base64Data: string,
  localPath?: string
): Promise<string> {
  return persistLocalEvidence(deliveryId, type, { base64Data, localPath, synced: false });
}

export async function saveLocalGpsLog(
  deliveryId: string | null,
  lat: number,
  lng: number,
  accuracy?: number
): Promise<void> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO gps_logs (id, delivery_id, lat, lng, accuracy, synced) VALUES (?, ?, ?, ?, ?, 0)`,
    id,
    deliveryId,
    lat,
    lng,
    accuracy ?? null
  );
}

export async function saveLocalIncident(
  deliveryId: string,
  type: string,
  description: string,
  lat?: number,
  lng?: number
): Promise<string> {
  const db = await getDatabase();
  const id = generateId();
  await db.runAsync(
    `INSERT INTO incidents (id, delivery_id, type, description, lat, lng, synced) VALUES (?, ?, ?, ?, ?, ?, 0)`,
    id,
    deliveryId,
    type,
    description,
    lat ?? null,
    lng ?? null
  );
  return id;
}
