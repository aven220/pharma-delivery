import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('pharma_delivery.db');
    await initSchema(db);
  }
  return db;
}

async function columnExists(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string
): Promise<boolean> {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return columns.some((c) => c.name === column);
}

async function migrateSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  const deliveriesExists = await database.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='deliveries'`
  );

  if (deliveriesExists && !(await columnExists(database, 'deliveries', 'owner_user_id'))) {
    await database.execAsync(`ALTER TABLE deliveries ADD COLUMN owner_user_id TEXT`);
  }

  const evidenceExists = await database.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='evidence'`
  );
  if (evidenceExists && !(await columnExists(database, 'evidence', 'remote_id'))) {
    await database.execAsync(`ALTER TABLE evidence ADD COLUMN remote_id TEXT`);
  }
}

async function initSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      address TEXT NOT NULL,
      lat REAL,
      lng REAL,
      synced_at TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id TEXT PRIMARY KEY,
      delivery_number TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      scheduled_date TEXT,
      scheduled_time TEXT,
      observations TEXT,
      items_json TEXT,
      assignment_json TEXT,
      synced_at TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES patients(id)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      retries INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 5,
      status TEXT DEFAULT 'PENDING',
      error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      lat REAL,
      lng REAL,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gps_logs (
      id TEXT PRIMARY KEY,
      delivery_id TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      accuracy REAL,
      synced INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      type TEXT NOT NULL,
      local_path TEXT,
      base64_data TEXT,
      remote_id TEXT,
      synced INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  await migrateSchema(database);

  if (await columnExists(database, 'deliveries', 'owner_user_id')) {
    await database.execAsync(
      `CREATE INDEX IF NOT EXISTS idx_deliveries_owner ON deliveries(owner_user_id)`
    );
  }
}

export async function clearLocalData(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM evidence;
    DELETE FROM gps_logs;
    DELETE FROM incidents;
    DELETE FROM sync_queue;
    DELETE FROM deliveries;
    DELETE FROM patients;
  `);
}
