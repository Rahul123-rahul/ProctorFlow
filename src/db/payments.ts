import { getDb } from '@/db/database';
import {
  PAID_STATUSES,
  type EventPaymentGroup,
  type EventPaymentProctor,
  type EventPaymentStatus,
  type PaymentStatus,
} from '@/db/types';

export interface GenerateResult {
  generated: number; // new payment rows created
  skipped: number; // proctors who already had a payment row (left untouched)
}

/**
 * For the period (YYYY-MM): create a pending payment row for every proctor on an
 * event that is marked COMPLETED, at the event's client rate. Existing payment
 * rows are never touched (INSERT OR IGNORE on the UNIQUE(event_id, proctor_id)
 * guard), so statuses already set are preserved.
 */
export async function generateEventPayments(period: string): Promise<GenerateResult> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ event_id: number; proctor_id: number; amount: number }>(
    `SELECT e.id AS event_id, ep.proctor_id AS proctor_id, c.rate_per_proctor AS amount
     FROM events e
     JOIN event_proctors ep ON ep.event_id = e.id
     JOIN clients c ON c.id = e.client_id
     WHERE e.status = 'completed' AND substr(e.event_date, 1, 7) = ?`,
    period
  );

  let generated = 0;
  let skipped = 0;
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      const res = await db.runAsync(
        `INSERT OR IGNORE INTO payments (event_id, proctor_id, amount, status)
         VALUES (?, ?, ?, 'pending')`,
        r.event_id,
        r.proctor_id,
        r.amount
      );
      if (res.changes > 0) generated++;
      else skipped++;
    }
  });
  return { generated, skipped };
}

interface PaymentRow {
  payment_id: number;
  event_id: number;
  proctor_id: number;
  amount: number;
  status: PaymentStatus;
  paid_date: string | null;
  proctor_name: string;
  upi_id: string | null;
  event_name: string | null;
  event_date: string;
  client_name: string;
  client_logo_url: string | null;
}

function computeStatus(proctors: EventPaymentProctor[]): EventPaymentStatus {
  if (proctors.length === 0) return 'open';
  return proctors.every((p) => PAID_STATUSES.includes(p.status)) ? 'completed' : 'open';
}

/** Events in the period that have payment rows, grouped with per-event totals. */
export async function getEventPaymentGroups(period: string): Promise<EventPaymentGroup[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PaymentRow>(
    `SELECT pm.id AS payment_id, pm.event_id AS event_id, pm.proctor_id AS proctor_id,
            pm.amount AS amount, pm.status AS status, pm.paid_date AS paid_date,
            p.full_name AS proctor_name, p.upi_id AS upi_id,
            e.event_name AS event_name, e.event_date AS event_date,
            c.name AS client_name, c.logo_url AS client_logo_url
     FROM payments pm
     JOIN events e ON e.id = pm.event_id
     JOIN proctors p ON p.id = pm.proctor_id
     JOIN clients c ON c.id = e.client_id
     WHERE substr(e.event_date, 1, 7) = ?
     ORDER BY e.event_date DESC, e.id DESC, p.full_name COLLATE NOCASE`,
    period
  );

  const map = new Map<number, EventPaymentGroup>();
  for (const r of rows) {
    let g = map.get(r.event_id);
    if (!g) {
      g = {
        event_id: r.event_id,
        event_name: r.event_name,
        event_date: r.event_date,
        client_name: r.client_name,
        client_logo_url: r.client_logo_url,
        payment_status: 'open',
        total: 0,
        paidCount: 0,
        paidAmount: 0,
        unpaidCount: 0,
        unpaidAmount: 0,
        proctors: [],
      };
      map.set(r.event_id, g);
    }
    g.proctors.push({
      payment_id: r.payment_id,
      proctor_id: r.proctor_id,
      proctor_name: r.proctor_name,
      upi_id: r.upi_id,
      amount: r.amount,
      status: r.status,
      paid_date: r.paid_date,
    });
    g.total += r.amount;
    if (PAID_STATUSES.includes(r.status)) {
      g.paidCount++;
      g.paidAmount += r.amount;
    } else {
      g.unpaidCount++;
      g.unpaidAmount += r.amount;
    }
  }

  const groups = Array.from(map.values());
  for (const g of groups) g.payment_status = computeStatus(g.proctors);
  return groups;
}

export interface PeriodPaymentSummary {
  total: number;
  paid: number;
  unpaid: number;
}

export async function getPeriodPaymentSummary(period: string): Promise<PeriodPaymentSummary> {
  const db = await getDb();
  const row = await db.getFirstAsync<PeriodPaymentSummary>(
    `SELECT
       COALESCE(SUM(pm.amount), 0) AS total,
       COALESCE(SUM(CASE WHEN pm.status IN ('cleared', 'settled') THEN pm.amount ELSE 0 END), 0) AS paid,
       COALESCE(SUM(CASE WHEN pm.status IN ('pending', 'on_hold') THEN pm.amount ELSE 0 END), 0) AS unpaid
     FROM payments pm
     JOIN events e ON e.id = pm.event_id
     WHERE substr(e.event_date, 1, 7) = ?`,
    period
  );
  return row ?? { total: 0, paid: 0, unpaid: 0 };
}

/** Sets a payment's status, stamping paid_date when it becomes cleared/settled. */
export async function setPaymentStatus(
  paymentId: number,
  status: PaymentStatus,
  paidDate: string
): Promise<void> {
  const db = await getDb();
  const paid = PAID_STATUSES.includes(status);
  await db.runAsync(
    `UPDATE payments SET status = ?, paid_date = ? WHERE id = ?`,
    status,
    paid ? paidDate : null,
    paymentId
  );
}