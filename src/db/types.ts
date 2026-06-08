// Shared TypeScript types mirroring the SQLite schema.
// All money values are INR; all dates stored ISO (YYYY-MM-DD), months as YYYY-MM.

export interface Proctor {
  id: number;
  full_name: string;
  govt_id: string | null;
  email: string | null;
  phone: string;
  upi_id: string | null; // UPI VPA for "Pay via UPI"
  is_active: number; // 1 = active, 0 = soft-deleted
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  rate_per_proctor: number;
  notes: string | null;
  logo_url: string | null; // optional custom logo override
  created_at: string;
}

export type EventStatus = 'scheduled' | 'completed' | 'no_show' | 'cancelled';

// An event = one client engagement on a date/time, with many proctors assigned.
// (Named EventRow to avoid clashing with the DOM `Event` global type.)
export interface EventRow {
  id: number;
  client_id: number;
  event_name: string | null; // e.g. "Samsung Exam - Bangalore"
  event_date: string; // YYYY-MM-DD
  login_time: string | null; // 24-hour "HH:mm"
  logout_time: string | null; // 24-hour "HH:mm"
  headcount: number | null; // how many proctors the event requires
  status: EventStatus;
  notes: string | null;
  created_at: string;
}

// One proctor assigned to an event, joined with display names + contact.
export interface EventProctorView {
  id: number; // event_proctors row id
  event_id: number;
  proctor_id: number;
  proctor_name: string;
  phone: string;
  email: string | null;
  replaced_proctor_id: number | null;
  replaced_proctor_name: string | null;
}

// Row for the events list: header fields + client name + how many proctors.
export interface EventListItem extends EventRow {
  client_name: string;
  client_logo_url: string | null;
  proctor_count: number;
}

// Full event for the detail/manage screen.
export interface EventDetail extends EventRow {
  client_name: string;
  client_logo_url: string | null;
  proctors: EventProctorView[];
}

// An event as seen from a single proctor's history.
export interface ProctorEventView extends EventRow {
  client_name: string;
  replaced_proctor_name: string | null;
}

// Per-proctor payment status. 'settled' = paid indirectly (counts as paid).
export type PaymentStatus = 'pending' | 'cleared' | 'on_hold' | 'settled';

/** Statuses that count as paid (used to compute event completion). */
export const PAID_STATUSES: PaymentStatus[] = ['cleared', 'settled'];

// Event-level (derived) payment status.
export type EventPaymentStatus = 'open' | 'completed';

export interface Payment {
  id: number;
  event_id: number;
  proctor_id: number;
  amount: number;
  status: PaymentStatus;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
}

// A proctor's payment within an event payment group.
export interface EventPaymentProctor {
  payment_id: number;
  proctor_id: number;
  proctor_name: string;
  upi_id: string | null;
  amount: number;
  status: PaymentStatus;
  paid_date: string | null;
}

// One event's payments, grouped for the Generate Payments screen.
export interface EventPaymentGroup {
  event_id: number;
  event_name: string | null;
  event_date: string;
  client_name: string;
  client_logo_url: string | null;
  payment_status: EventPaymentStatus; // open until all proctors paid
  total: number;
  paidCount: number; // cleared + settled
  paidAmount: number;
  unpaidCount: number; // pending + on_hold
  unpaidAmount: number;
  proctors: EventPaymentProctor[];
}

// ---- Agent statement (monthly billing report) ----

export interface AdditionalPayment {
  id: number;
  period: string; // YYYY-MM
  date: string | null; // YYYY-MM-DD
  reason: string | null;
  amount: number;
  created_at: string;
}

export interface ClientStatementEvent {
  event_id: number;
  event_date: string;
  proctor_count: number;
}

export interface ClientStatementGroup {
  client_id: number;
  client_name: string;
  client_logo_url: string | null;
  rate: number; // rate_per_proctor
  events: ClientStatementEvent[];
  total_proctors: number;
  subtotal: number; // total_proctors * rate
}

// A payment as seen in a single proctor's history (joined to its event).
export interface ProctorPaymentView {
  id: number;
  event_id: number;
  amount: number;
  status: PaymentStatus;
  paid_date: string | null;
  event_name: string | null;
  event_date: string;
  client_name: string;
}