import { getDb } from '@/db/database';
import type { AdditionalPayment, ClientStatementGroup } from '@/db/types';

/**
 * Per-client billing for the month: each COMPLETED event's date + proctor count,
 * grouped by client, with subtotal = (total proctors that month) × client rate.
 */
export async function getClientStatement(period: string): Promise<ClientStatementGroup[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    client_id: number;
    client_name: string;
    client_logo_url: string | null;
    rate: number;
    event_id: number;
    event_date: string;
    proctor_count: number;
  }>(
    `SELECT c.id AS client_id, c.name AS client_name, c.logo_url AS client_logo_url,
            c.rate_per_proctor AS rate,
            e.id AS event_id, e.event_date AS event_date,
            (SELECT COUNT(*) FROM event_proctors ep WHERE ep.event_id = e.id) AS proctor_count
     FROM events e
     JOIN clients c ON c.id = e.client_id
     WHERE e.status = 'completed' AND substr(e.event_date, 1, 7) = ?
     ORDER BY c.name COLLATE NOCASE, e.event_date, e.id`,
    period
  );

  const map = new Map<number, ClientStatementGroup>();
  for (const r of rows) {
    let g = map.get(r.client_id);
    if (!g) {
      g = {
        client_id: r.client_id,
        client_name: r.client_name,
        client_logo_url: r.client_logo_url,
        rate: r.rate,
        events: [],
        total_proctors: 0,
        subtotal: 0,
      };
      map.set(r.client_id, g);
    }
    g.events.push({ event_id: r.event_id, event_date: r.event_date, proctor_count: r.proctor_count });
    g.total_proctors += r.proctor_count;
  }
  const groups = Array.from(map.values());
  for (const g of groups) g.subtotal = g.total_proctors * g.rate;
  return groups;
}

export async function listAdditionalPayments(period: string): Promise<AdditionalPayment[]> {
  const db = await getDb();
  return db.getAllAsync<AdditionalPayment>(
    `SELECT * FROM additional_payments WHERE period = ? ORDER BY date, id`,
    period
  );
}

export async function addAdditionalPayment(
  period: string,
  date: string | null,
  reason: string,
  amount: number
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO additional_payments (period, date, reason, amount) VALUES (?, ?, ?, ?)`,
    period,
    date?.trim() || null,
    reason.trim() || null,
    amount
  );
  return result.lastInsertRowId;
}

export async function deleteAdditionalPayment(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM additional_payments WHERE id = ?`, id);
}