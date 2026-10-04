import type { EventItem } from "../types";
import { asArray, asString, clean, get, toIso } from "./util";

/** Google returns all-day events as `{ date: "2026-10-03" }`; timed ones as `{ dateTime }`. */
function eventTime(value: unknown): { iso?: string; allDay: boolean } {
  const dateTime = asString(get(value, "dateTime"));
  if (dateTime) return { iso: toIso(dateTime), allDay: false };
  const date = asString(get(value, "date"));
  if (date) return { iso: `${date}T00:00:00.000Z`, allDay: true };
  return { allDay: false };
}

/**
 * GOOGLECALENDAR_EVENTS_LIST → EventItem[], sorted by start time. Cancelled
 * events and events the reader declined are left out of the schedule.
 */
export function normalizeCalendar(data: unknown): EventItem[] {
  const raw = asArray(get(data, "items")).length
    ? asArray(get(data, "items"))
    : asArray(get(data, "events"));

  const items: EventItem[] = [];
  for (const event of raw) {
    const id = asString(get(event, "id"));
    if (!id || asString(get(event, "status")) === "cancelled") continue;

    const attendees = asArray(get(event, "attendees"));
    const self = attendees.find((a) => get(a, "self") === true);
    if (self && asString(get(self, "responseStatus")) === "declined") continue;

    const start = eventTime(get(event, "start"));
    const end = eventTime(get(event, "end"));
    if (!start.iso) continue;

    const organizer =
      asString(get(event, "organizer", "displayName")) ?? asString(get(event, "organizer", "email"));
    const location = asString(get(event, "location"));

    items.push({
      kind: "event",
      id: `googlecalendar:${id}`,
      title: clean(asString(get(event, "summary")) || "(untitled event)", 140),
      start: start.iso,
      end: end.iso ?? start.iso,
      allDay: start.allDay,
      ...(location ? { location: clean(location, 120) } : {}),
      ...(organizer && get(event, "organizer", "self") !== true
        ? { organizer: clean(organizer, 80) }
        : {}),
      attendeeCount: attendees.length,
      url: asString(get(event, "htmlLink")),
    });
  }
  return items.sort((a, b) => a.start.localeCompare(b.start));
}
