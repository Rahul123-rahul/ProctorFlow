// Display + parsing helpers. Storage is ISO (YYYY-MM-DD) / period (YYYY-MM);
// money is INR. Display dates as DD MMM YYYY and money with the ₹ symbol.

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Local-time today as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Current month as YYYY-MM. */
export function currentPeriod(): string {
  return todayISO().slice(0, 7);
}

/** True if the ISO date is today (local). */
export function isToday(iso: string | null | undefined): boolean {
  return !!iso && iso.slice(0, 10) === todayISO();
}

/** Current local time as 24-hour "HH:mm". */
export function nowHHmm(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/**
 * "Ongoing" = the event is today AND the current time is within its login–logout
 * window. Times are stored 24-hour "HH:mm" (zero-padded, so string compare works).
 * Missing login → no lower bound; missing logout → no upper bound.
 */
export function isOngoing(
  eventDate: string | null | undefined,
  loginTime: string | null | undefined,
  logoutTime: string | null | undefined
): boolean {
  if (!isToday(eventDate)) return false;
  const now = nowHHmm();
  const login = loginTime?.trim();
  const logout = logoutTime?.trim();
  if (login && now < login) return false; // before start
  if (logout && now > logout) return false; // after end
  return true;
}

/** "2026-06-07" -> "07 Jun 2026". Returns the input unchanged if it can't parse. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11) return iso;
  return `${m[3]} ${MONTHS[month]} ${m[1]}`;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "2026-06-07" -> "Sat". Empty string if it can't parse. */
export function formatWeekday(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return WEEKDAYS[d.getDay()] ?? '';
}

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function ordinal(day: number): string {
  const v = day % 100;
  if (v >= 11 && v <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "2026-06-04" -> "4th June" (for the shareable proctor list header). */
export function formatShareDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11) return iso;
  return `${ordinal(parseInt(m[3], 10))} ${FULL_MONTHS[month]}`;
}

/**
 * Display a stored time as 12-hour "hh:mm AM/PM". Times are stored as 24-hour
 * "HH:mm", but this also tolerates values already in 12-hour form (legacy data).
 */
export function formatTime12(stored: string | null | undefined): string {
  if (!stored) return '';
  const s = stored.trim();
  const ampm = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(s);
  if (ampm) {
    const h = parseInt(ampm[1], 10);
    return `${pad2(h === 0 ? 12 : h)}:${ampm[2]} ${ampm[3].toUpperCase()}`;
  }
  const h24 = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (h24) {
    const h = parseInt(h24[1], 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${pad2(h12)}:${h24[2]} ${suffix}`;
  }
  return s;
}

/** Compact event date, e.g. "9th Jun TUE" (ordinal day · Title month · UPPER weekday). */
export function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const year = +m[1];
  const monthIdx = +m[2] - 1;
  const day = +m[3];
  if (monthIdx < 0 || monthIdx > 11) return iso;
  const wd = new Date(year, monthIdx, day).getDay();
  return `${ordinal(day)} ${MONTHS[monthIdx]} ${(WEEKDAYS[wd] ?? '').toUpperCase()}`;
}

/** Auto event name, e.g. "9th Jun TUE Samsung". */
export function defaultEventName(eventDate: string, clientName: string): string {
  return [formatEventDate(eventDate), clientName].filter(Boolean).join(' ');
}

/** The name to show for an event: the custom name if set, else the auto default. */
export function eventDisplayName(
  eventName: string | null | undefined,
  eventDate: string,
  clientName: string
): string {
  const custom = eventName?.trim();
  return custom || defaultEventName(eventDate, clientName);
}

/** "2026-06" -> "Jun 2026". */
export function formatMonth(period: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(period);
  if (!m) return period;
  const month = parseInt(m[2], 10) - 1;
  if (month < 0 || month > 11) return period;
  return `${MONTHS[month]} ${m[1]}`;
}

/** INR with thousands separators, no decimals unless needed. e.g. 12500 -> "₹12,500". */
export function formatINR(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const hasFraction = rounded % 1 !== 0;
  const formatted = rounded.toLocaleString('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `₹${formatted}`;
}

/** True for a real calendar date in YYYY-MM-DD form. */
export function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return false;
  const year = +m[1];
  const month = +m[2];
  const day = +m[3];
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Shift a YYYY-MM period by `delta` months. */
export function addMonths(period: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(period);
  if (!m) return period;
  const total = (+m[1]) * 12 + (+m[2] - 1) + delta;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${pad2(month)}`;
}