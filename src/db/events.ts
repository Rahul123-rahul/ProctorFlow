import { getDb } from '@/db/database';
import type { EventDetail, EventListItem, EventProctorView, EventStatus } from '@/db/types';

export interface EventFilter {
  clientId?: number | null;
  fromDate?: string | null; // YYYY-MM-DD inclusive
  toDate?: string | null; // YYYY-MM-DD inclusive
}

export async function listEvents(filter: EventFilter = {}): Promise<EventListItem[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.clientId != null) {
    where.push('e.client_id = ?');
    params.push(filter.clientId);
  }
  if (filter.fromDate) {
    where.push('e.event_date >= ?');
    params.push(filter.fromDate);
  }
  if (filter.toDate) {
    where.push('e.event_date <= ?');
    params.push(filter.toDate);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return db.getAllAsync<EventListItem>(
    `SELECT e.*, c.name AS client_name, c.logo_url AS client_logo_url,
            (SELECT COUNT(*) FROM event_proctors ep WHERE ep.event_id = e.id) AS proctor_count
     FROM events e
     JOIN clients c ON c.id = e.client_id
     ${whereSql}
     ORDER BY e.event_date DESC, e.id DESC`,
    params
  );
}

/** Events on or after `date`, soonest first — for the dashboard + schedule view. */
export async function listEventsFromDate(date: string): Promise<EventListItem[]> {
  const db = await getDb();
  return db.getAllAsync<EventListItem>(
    `SELECT e.*, c.name AS client_name, c.logo_url AS client_logo_url,
            (SELECT COUNT(*) FROM event_proctors ep WHERE ep.event_id = e.id) AS proctor_count
     FROM events e
     JOIN clients c ON c.id = e.client_id
     WHERE e.event_date >= ?
     ORDER BY e.event_date ASC, e.id ASC`,
    date
  );
}

export async function getEventProctors(eventId: number): Promise<EventProctorView[]> {
  const db = await getDb();
  return db.getAllAsync<EventProctorView>(
    `SELECT ep.id, ep.event_id, ep.proctor_id,
            p.full_name AS proctor_name, p.phone AS phone, p.email AS email,
            ep.replaced_proctor_id, rp.full_name AS replaced_proctor_name
     FROM event_proctors ep
     JOIN proctors p ON p.id = ep.proctor_id
     LEFT JOIN proctors rp ON rp.id = ep.replaced_proctor_id
     WHERE ep.event_id = ?
     ORDER BY p.full_name COLLATE NOCASE`,
    eventId
  );
}

export async function getEvent(id: number): Promise<EventDetail | null> {
  const db = await getDb();
  const header = await db.getFirstAsync<Omit<EventDetail, 'proctors'>>(
    `SELECT e.*, c.name AS client_name, c.logo_url AS client_logo_url
     FROM events e JOIN clients c ON c.id = e.client_id
     WHERE e.id = ?`,
    id
  );
  if (!header) return null;
  const proctors = await getEventProctors(id);
  return { ...header, proctors };
}

export interface EventHeaderInput {
  client_id: number;
  event_name?: string | null;
  event_date: string;
  login_time?: string | null;
  logout_time?: string | null;
  headcount?: number | null;
  notes?: string | null;
}

export interface NewEvent extends EventHeaderInput {
  proctor_ids: number[];
}

/** Creates the event and assigns the selected proctors, in one transaction. */
export async function createEvent(input: NewEvent): Promise<number> {
  const db = await getDb();
  let eventId = 0;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      `INSERT INTO events (client_id, event_name, event_date, login_time, logout_time, headcount, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.client_id,
      input.event_name?.trim() || null,
      input.event_date,
      input.login_time?.trim() || null,
      input.logout_time?.trim() || null,
      input.headcount ?? null,
      input.notes?.trim() || null
    );
    eventId = res.lastInsertRowId;
    for (const proctorId of input.proctor_ids) {
      await db.runAsync(
        `INSERT OR IGNORE INTO event_proctors (event_id, proctor_id) VALUES (?, ?)`,
        eventId,
        proctorId
      );
    }
  });
  return eventId;
}

/** Updates the event's header fields (client, date, times, headcount, notes). */
export async function updateEventHeader(id: number, input: EventHeaderInput): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE events
     SET client_id = ?, event_name = ?, event_date = ?, login_time = ?, logout_time = ?,
         headcount = ?, notes = ?
     WHERE id = ?`,
    input.client_id,
    input.event_name?.trim() || null,
    input.event_date,
    input.login_time?.trim() || null,
    input.logout_time?.trim() || null,
    input.headcount ?? null,
    input.notes?.trim() || null,
    id
  );
}

export async function setEventStatus(id: number, status: EventStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE events SET status = ? WHERE id = ?`, status, id);
}

/** Adds proctors to an event; ignores any already assigned. Returns how many were added. */
export async function addProctorsToEvent(eventId: number, proctorIds: number[]): Promise<number> {
  const db = await getDb();
  let added = 0;
  await db.withTransactionAsync(async () => {
    for (const proctorId of proctorIds) {
      const res = await db.runAsync(
        `INSERT OR IGNORE INTO event_proctors (event_id, proctor_id) VALUES (?, ?)`,
        eventId,
        proctorId
      );
      added += res.changes;
    }
  });
  return added;
}

/** Hard-removes one proctor assignment from an event. */
export async function removeEventProctor(eventProctorId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM event_proctors WHERE id = ?`, eventProctorId);
}

/**
 * Replaces the proctor on an existing assignment: records the old proctor as
 * replaced_proctor_id and switches proctor_id to the new one. The caller must
 * ensure the new proctor isn't already on the event (UNIQUE(event_id, proctor_id)).
 */
export async function replaceEventProctor(
  eventProctorId: number,
  newProctorId: number
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE event_proctors
     SET replaced_proctor_id = proctor_id, proctor_id = ?
     WHERE id = ?`,
    newProctorId,
    eventProctorId
  );
}

/** Deletes an entire event and its proctor assignments (ON DELETE CASCADE). */
export async function deleteEvent(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM events WHERE id = ?`, id);
}