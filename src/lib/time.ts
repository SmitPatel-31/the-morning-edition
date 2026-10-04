/**
 * Timezone helpers built on Intl only, so no date library is needed.
 */

/** The calendar date ("2026-10-03") at `now` in `timeZone`. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Offset of `timeZone` from UTC at `at`, in minutes (New York in October → -240). */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000);
}

/** UTC instant of local midnight starting `date` in `timeZone`. */
export function startOfLocalDay(date: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d));
  // Two passes settle DST transitions that fall near midnight.
  let instant = new Date(guess.getTime() - tzOffsetMinutes(timeZone, guess) * 60000);
  instant = new Date(guess.getTime() - tzOffsetMinutes(timeZone, instant) * 60000);
  return instant;
}

/** Start (inclusive) and end (exclusive) of the reader's local day containing `now`. */
export function localDayBounds(timeZone: string, now: Date = new Date()) {
  const date = localDate(timeZone, now);
  const start = startOfLocalDay(date, timeZone);
  const [y, m, d] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  const end = startOfLocalDay(nextDate, timeZone);
  return { date, start, end };
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
