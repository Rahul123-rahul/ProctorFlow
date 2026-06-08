import { getDb } from '@/db/database';

export interface DashboardStats {
  todayCount: number; // events today
  monthEvents: number; // events this month
  paymentsPending: number; // unpaid payment rows (pending + on_hold) for this month's events
  paymentsCleared: number; // paid payment rows (cleared + settled) for this month's events
  activeProctors: number;
}

export async function getDashboardStats(today: string, period: string): Promise<DashboardStats> {
  const db = await getDb();
  const row = await db.getFirstAsync<DashboardStats>(
    `SELECT
       (SELECT COUNT(*) FROM events WHERE event_date = $today) AS todayCount,
       (SELECT COUNT(*) FROM events WHERE substr(event_date, 1, 7) = $period) AS monthEvents,
       (SELECT COUNT(*) FROM payments pm JOIN events e ON e.id = pm.event_id
         WHERE substr(e.event_date, 1, 7) = $period AND pm.status IN ('pending', 'on_hold'))
         AS paymentsPending,
       (SELECT COUNT(*) FROM payments pm JOIN events e ON e.id = pm.event_id
         WHERE substr(e.event_date, 1, 7) = $period AND pm.status IN ('cleared', 'settled'))
         AS paymentsCleared,
       (SELECT COUNT(*) FROM proctors WHERE is_active = 1) AS activeProctors`,
    { $today: today, $period: period }
  );
  return (
    row ?? {
      todayCount: 0,
      monthEvents: 0,
      paymentsPending: 0,
      paymentsCleared: 0,
      activeProctors: 0,
    }
  );
}