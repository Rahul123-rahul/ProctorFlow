import * as SQLite from 'expo-sqlite';

const DB_NAME = 'proctorflow.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS proctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  govt_id TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  upi_id TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rate_per_proctor REAL NOT NULL DEFAULT 0,
  notes TEXT,
  logo_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Simple key/value store (used to persist the login session).
CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- An event is one client engagement on a date/time. Its status (scheduled /
-- completed / no_show / cancelled) applies to the whole event.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  event_name TEXT,
  event_date TEXT NOT NULL,
  login_time TEXT,
  logout_time TEXT,
  headcount INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Proctors assigned to an event. Removing a proctor hard-deletes its row here.
CREATE TABLE IF NOT EXISTS event_proctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proctor_id INTEGER NOT NULL REFERENCES proctors(id),
  replaced_proctor_id INTEGER REFERENCES proctors(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, proctor_id)
);

-- Payments are per (event, proctor). status: pending|cleared|on_hold|settled.
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  proctor_id INTEGER NOT NULL REFERENCES proctors(id),
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, proctor_id)
);

-- Ad-hoc extra line items added to a month's agent statement (date, reason, amount).
CREATE TABLE IF NOT EXISTS additional_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  date TEXT,
  reason TEXT,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_additional_period ON additional_payments(period);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_client ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_event_proctors_event ON event_proctors(event_id);
CREATE INDEX IF NOT EXISTS idx_event_proctors_proctor ON event_proctors(proctor_id);
CREATE INDEX IF NOT EXISTS idx_payments_event ON payments(event_id);
CREATE INDEX IF NOT EXISTS idx_payments_proctor ON payments(proctor_id);
`;

/**
 * One-time, non-destructive migration: if an old `deployments` table exists and
 * the new `events` table is still empty, fold each (client, date, time) group of
 * deployment rows into one event with its proctors. The old table is left
 * untouched (never dropped) so nothing is lost.
 */
async function migrateDeployments(db: SQLite.SQLiteDatabase): Promise<void> {
  const hasDep = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'deployments'`
  );
  if (!hasDep) return;

  const counts = await db.getFirstAsync<{ events: number; deps: number }>(
    `SELECT (SELECT COUNT(*) FROM events) AS events, (SELECT COUNT(*) FROM deployments) AS deps`
  );
  if (!counts || counts.events > 0 || counts.deps === 0) return;

  const groups = await db.getAllAsync<{
    client_id: number;
    deploy_date: string;
    t: string;
    status: string;
    notes: string | null;
  }>(
    `SELECT client_id, deploy_date, COALESCE(deploy_time, '') AS t,
            CASE WHEN SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) = COUNT(*)
                 THEN 'completed' ELSE 'scheduled' END AS status,
            MAX(notes) AS notes
     FROM deployments
     GROUP BY client_id, deploy_date, COALESCE(deploy_time, '')`
  );

  await db.withTransactionAsync(async () => {
    for (const g of groups) {
      const res = await db.runAsync(
        `INSERT INTO events (client_id, event_date, login_time, status, notes) VALUES (?, ?, ?, ?, ?)`,
        g.client_id,
        g.deploy_date,
        g.t || null,
        g.status,
        g.notes
      );
      const eventId = res.lastInsertRowId;
      const rows = await db.getAllAsync<{ proctor_id: number; replaced_proctor_id: number | null }>(
        `SELECT proctor_id, replaced_proctor_id FROM deployments
         WHERE client_id = ? AND deploy_date = ? AND COALESCE(deploy_time, '') = ?`,
        g.client_id,
        g.deploy_date,
        g.t
      );
      for (const r of rows) {
        await db.runAsync(
          `INSERT OR IGNORE INTO event_proctors (event_id, proctor_id, replaced_proctor_id)
           VALUES (?, ?, ?)`,
          eventId,
          r.proctor_id,
          r.replaced_proctor_id
        );
      }
    }
  });
}

/** Adds the clients.logo_url column to databases created before it existed. */
async function migrateClientLogo(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(clients)`);
  if (!cols.some((c) => c.name === 'logo_url')) {
    await db.execAsync(`ALTER TABLE clients ADD COLUMN logo_url TEXT`);
  }
}

/**
 * Adds events.login_time / logout_time / headcount to older databases. The old
 * single `event_time` value (if present) is carried over into login_time.
 */
async function migrateEventTimes(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(events)`);
  const has = (name: string) => cols.some((c) => c.name === name);
  if (!has('login_time')) {
    await db.execAsync(`ALTER TABLE events ADD COLUMN login_time TEXT`);
    if (has('event_time')) {
      await db.execAsync(`UPDATE events SET login_time = event_time`);
    }
  }
  if (!has('logout_time')) {
    await db.execAsync(`ALTER TABLE events ADD COLUMN logout_time TEXT`);
  }
  if (!has('headcount')) {
    await db.execAsync(`ALTER TABLE events ADD COLUMN headcount INTEGER`);
  }
}

/** Adds proctors.upi_id to older databases (used for UPI payment links). */
async function migrateProctorUpi(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(proctors)`);
  if (!cols.some((c) => c.name === 'upi_id')) {
    await db.execAsync(`ALTER TABLE proctors ADD COLUMN upi_id TEXT`);
  }
}

/** Adds events.event_name to older databases. */
async function migrateEventName(db: SQLite.SQLiteDatabase): Promise<void> {
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(events)`);
  if (!cols.some((c) => c.name === 'event_name')) {
    await db.execAsync(`ALTER TABLE events ADD COLUMN event_name TEXT`);
  }
}

/** Converts any legacy 12-hour login/logout times ("hh:mm AM/PM") to 24-hour "HH:mm". */
async function migrateEventTimeFormat(db: SQLite.SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ id: number; login_time: string | null; logout_time: string | null }>(
    `SELECT id, login_time, logout_time FROM events
     WHERE login_time LIKE '%M' OR logout_time LIKE '%M'`
  );
  const to24 = (v: string | null): string | null => {
    if (!v) return v;
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v.trim());
    if (!m) return v;
    let h = parseInt(m[1], 10) % 12;
    if (/pm/i.test(m[3])) h += 12;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${m[2]}`;
  };
  for (const r of rows) {
    await db.runAsync(
      `UPDATE events SET login_time = ?, logout_time = ? WHERE id = ?`,
      to24(r.login_time),
      to24(r.logout_time),
      r.id
    );
  }
}

/**
 * Pre-schema migration: if a legacy month-based `payments` table exists (has a
 * `period` column, no `event_id`), rename it to `payments_monthly_legacy` so its
 * data is preserved. The new event-based `payments` table is then created fresh
 * by the schema. Runs BEFORE the schema's CREATE TABLE so the rename takes effect.
 */
async function premigratePayments(db: SQLite.SQLiteDatabase): Promise<void> {
  const exists = await db.getFirstAsync<{ name: string }>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payments'`
  );
  if (!exists) return;
  const cols = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(payments)`);
  const hasEventId = cols.some((c) => c.name === 'event_id');
  const hasPeriod = cols.some((c) => c.name === 'period');
  if (!hasEventId && hasPeriod) {
    await db.execAsync(`ALTER TABLE payments RENAME TO payments_monthly_legacy`);
  }
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Rename a legacy month-based payments table before the schema recreates it.
  await premigratePayments(db);
  await db.execAsync(SCHEMA);
  await migrateClientLogo(db);
  await migrateProctorUpi(db);
  await migrateEventTimes(db);
  await migrateEventName(db);
  await migrateEventTimeFormat(db);
  await migrateDeployments(db);
  return db;
}

/**
 * Returns the shared database connection, opening + initializing it on first call.
 * Initialization runs exactly once (the promise is cached).
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = initDatabase();
  }
  return dbPromise;
}