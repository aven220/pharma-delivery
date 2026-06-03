import { getDatabase } from '../database';
import { sortDeliveryDtos } from '../lib/deliveryListUtils';
import type { DeliveryDTO } from '@pharma/types';

const HIDDEN_STATUSES = ['CANCELLED', 'RETURNED'];

export async function clearLocalDeliveries(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM deliveries`);
  await db.runAsync(`DELETE FROM patients`);
}

export async function replaceCourierDeliveries(
  deliveries: DeliveryDTO[],
  ownerUserId?: string | null
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM deliveries`);
  if (deliveries.length === 0) return;
  await upsertDeliveries(deliveries, ownerUserId);
}

export async function upsertDeliveries(
  deliveries: DeliveryDTO[],
  ownerUserId?: string | null
): Promise<void> {
  const db = await getDatabase();

  for (const d of deliveries) {
    await db.runAsync(
      `INSERT OR REPLACE INTO patients (id, document_id, first_name, last_name, phone, address, lat, lng, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      d.patient.id,
      d.patient.documentId,
      d.patient.firstName,
      d.patient.lastName,
      d.patient.phone ?? null,
      d.patient.address,
      d.patient.lat ?? null,
      d.patient.lng ?? null
    );

    await db.runAsync(
      `INSERT OR REPLACE INTO deliveries (id, delivery_number, patient_id, status, priority, scheduled_date, scheduled_time, observations, items_json, assignment_json, owner_user_id, synced_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      d.id,
      d.deliveryNumber,
      d.patient.id,
      d.status,
      d.priority,
      d.scheduledDate,
      d.scheduledTime,
      d.observations ?? null,
      JSON.stringify(d.items),
      d.assignment ? JSON.stringify(d.assignment) : null,
      ownerUserId ?? d.assignment?.courier?.id ?? null
    );
  }
}

export async function getLocalDeliveries(
  status?: string,
  currentUserId?: string | null
): Promise<DeliveryDTO[]> {
  const db = await getDatabase();
  const baseQuery = `SELECT d.*, p.document_id, p.first_name, p.last_name, p.phone, p.address, p.lat, p.lng
       FROM deliveries d JOIN patients p ON d.patient_id = p.id`;
  const ownerClause = currentUserId ? ` AND (d.owner_user_id IS NULL OR d.owner_user_id = ?)` : '';
  const query = status
    ? `${baseQuery} WHERE d.status = ?${ownerClause}`
    : `${baseQuery}${currentUserId ? ' WHERE d.owner_user_id IS NULL OR d.owner_user_id = ?' : ''}`;

  const params = status
    ? currentUserId
      ? [status, currentUserId]
      : [status]
    : currentUserId
      ? [currentUserId]
      : [];

  const rows =
    params.length > 0
      ? await db.getAllAsync<Record<string, unknown>>(query, ...params)
      : await db.getAllAsync<Record<string, unknown>>(query);

  const mapped = rows.map(mapRowToDelivery);
  const filtered = status
    ? mapped
    : mapped.filter((d) => !HIDDEN_STATUSES.includes(d.status));

  return sortDeliveryDtos(filtered);
}

export async function getLocalDelivery(id: string, currentUserId?: string | null): Promise<DeliveryDTO | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    currentUserId
      ? `SELECT d.*, p.document_id, p.first_name, p.last_name, p.phone, p.address, p.lat, p.lng
     FROM deliveries d JOIN patients p ON d.patient_id = p.id
     WHERE d.id = ? AND (d.owner_user_id IS NULL OR d.owner_user_id = ?)`
      : `SELECT d.*, p.document_id, p.first_name, p.last_name, p.phone, p.address, p.lat, p.lng
     FROM deliveries d JOIN patients p ON d.patient_id = p.id WHERE d.id = ?`,
    ...(currentUserId ? [id, currentUserId] : [id])
  );
  return row ? mapRowToDelivery(row) : null;
}

export async function updateLocalDeliveryStatus(id: string, status: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE deliveries SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    status,
    id
  );
}

function mapRowToDelivery(row: Record<string, unknown>): DeliveryDTO {
  return {
    id: row.id as string,
    deliveryNumber: row.delivery_number as string,
    status: row.status as DeliveryDTO['status'],
    priority: row.priority as DeliveryDTO['priority'],
    scheduledDate: row.scheduled_date as string | null,
    scheduledTime: row.scheduled_time as string | null,
    patient: {
      id: row.patient_id as string,
      documentId: row.document_id as string,
      firstName: row.first_name as string,
      lastName: row.last_name as string,
      phone: row.phone as string | null,
      address: row.address as string,
    },
    items: JSON.parse((row.items_json as string) || '[]'),
    assignment: row.assignment_json ? JSON.parse(row.assignment_json as string) : null,
  };
}

export async function getPendingSyncCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING' OR status = 'FAILED'`
  );
  return result?.count ?? 0;
}
