import { getDb } from '@/db/database';

// The ONLY account allowed to use this app. Single-user, on-device.
// NOTE: these live in the app bundle, so this gate keeps casual users out but
// is not strong security against someone who decompiles the build.
const ALLOWED_EMAIL = 'rahulrahul6005@gmail.com';
const ALLOWED_PASSWORD = '888411';

const SESSION_KEY = 'session_active';

async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_meta WHERE key = ?`,
    key
  );
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value
  );
}

/** True if a login session is currently active (persisted across restarts). */
export async function isSessionActive(): Promise<boolean> {
  return (await getMeta(SESSION_KEY)) === '1';
}

/**
 * Validates credentials against the single allowed account. On success, persists
 * the session and returns true. Email check is case-insensitive.
 */
export async function login(email: string, password: string): Promise<boolean> {
  const ok = email.trim().toLowerCase() === ALLOWED_EMAIL && password === ALLOWED_PASSWORD;
  if (ok) await setMeta(SESSION_KEY, '1');
  return ok;
}

export async function logout(): Promise<void> {
  await setMeta(SESSION_KEY, '0');
}