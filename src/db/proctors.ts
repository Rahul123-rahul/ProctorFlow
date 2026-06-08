import { getDb } from '@/db/database';
import type { Proctor, ProctorEventView, ProctorPaymentView } from '@/db/types';

export interface ProctorInput {
  full_name: string;
  phone: string;
  govt_id?: string | null;
  email?: string | null;
  upi_id?: string | null;
}

/** Active proctors only, optionally filtered by a name/phone search term. */
export async function listActiveProctors(search?: string): Promise<Proctor[]> {
  const db = await getDb();
  const term = search?.trim();
  if (term) {
    const like = `%${term}%`;
    return db.getAllAsync<Proctor>(
      `SELECT * FROM proctors
       WHERE is_active = 1 AND (full_name LIKE ? OR phone LIKE ?)
       ORDER BY full_name COLLATE NOCASE`,
      like,
      like
    );
  }
  return db.getAllAsync<Proctor>(
    `SELECT * FROM proctors WHERE is_active = 1 ORDER BY full_name COLLATE NOCASE`
  );
}

export async function getProctor(id: number): Promise<Proctor | null> {
  const db = await getDb();
  return db.getFirstAsync<Proctor>(`SELECT * FROM proctors WHERE id = ?`, id);
}

export async function createProctor(input: ProctorInput): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO proctors (full_name, phone, govt_id, email, upi_id) VALUES (?, ?, ?, ?, ?)`,
    input.full_name.trim(),
    input.phone.trim(),
    input.govt_id?.trim() || null,
    input.email?.trim() || null,
    input.upi_id?.trim() || null
  );
  return result.lastInsertRowId;
}

export async function updateProctor(id: number, input: ProctorInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE proctors SET full_name = ?, phone = ?, govt_id = ?, email = ?, upi_id = ? WHERE id = ?`,
    input.full_name.trim(),
    input.phone.trim(),
    input.govt_id?.trim() || null,
    input.email?.trim() || null,
    input.upi_id?.trim() || null,
    id
  );
}

/** Soft delete — keeps the row so history (deployments/payments) is preserved. */
export async function deactivateProctor(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE proctors SET is_active = 0 WHERE id = ?`, id);
}

/** All events a proctor is currently assigned to, newest first, with names. */
export async function getProctorEvents(proctorId: number): Promise<ProctorEventView[]> {
  const db = await getDb();
  return db.getAllAsync<ProctorEventView>(
    `SELECT e.*, c.name AS client_name,
            rp.full_name AS replaced_proctor_name
     FROM event_proctors ep
     JOIN events e ON e.id = ep.event_id
     JOIN clients c ON c.id = e.client_id
     LEFT JOIN proctors rp ON rp.id = ep.replaced_proctor_id
     WHERE ep.proctor_id = ?
     ORDER BY e.event_date DESC, e.id DESC`,
    proctorId
  );
}

export async function getProctorPayments(proctorId: number): Promise<ProctorPaymentView[]> {
  const db = await getDb();
  return db.getAllAsync<ProctorPaymentView>(
    `SELECT pm.id AS id, pm.event_id AS event_id, pm.amount AS amount,
            pm.status AS status, pm.paid_date AS paid_date,
            e.event_name AS event_name, e.event_date AS event_date, c.name AS client_name
     FROM payments pm
     JOIN events e ON e.id = pm.event_id
     JOIN clients c ON c.id = e.client_id
     WHERE pm.proctor_id = ?
     ORDER BY e.event_date DESC, e.id DESC`,
    proctorId
  );
}