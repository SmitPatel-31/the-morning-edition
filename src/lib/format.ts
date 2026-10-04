/** Display formatting for the front page, always in the edition's timezone. */

export function longDate(date: string): string {
  // `date` is a local calendar date; format it at noon UTC so no timezone shifts the day.
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function shortDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function clockTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone })
    .format(new Date(iso))
    .replace(" AM", " am")
    .replace(" PM", " pm");
}

export function waitedFor(iso: string, now: Date): string {
  const hours = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "opened just now";
  if (hours < 24) return `waiting ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  return `waiting ${days} day${days === 1 ? "" : "s"}`;
}

const ROMAN: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
  [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

export function roman(n: number): string {
  let out = "";
  for (const [value, numeral] of ROMAN) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}
