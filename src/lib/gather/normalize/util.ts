/**
 * Small, total helpers for picking fields out of tool responses whose shape
 * we don't control. They never throw; missing or mistyped fields become
 * undefined so a single odd record can't sink a whole section.
 */

export type Obj = Record<string, unknown>;

export function asObj(value: unknown): Obj | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** Follows a dotted path through nested objects: `get(x, "user", "login")`. */
export function get(value: unknown, ...path: string[]): unknown {
  let current: unknown = value;
  for (const key of path) {
    const obj = asObj(current);
    if (!obj) return undefined;
    current = obj[key];
  }
  return current;
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Decodes common HTML entities, collapses whitespace, and trims to `max` chars. */
export function clean(text: string | undefined, max: number): string {
  if (!text) return "";
  const decoded = text
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
  if (decoded.length <= max) return decoded;
  return decoded.slice(0, max - 1).trimEnd() + "…";
}

/** Parses an ISO string or epoch (seconds or ms) into an ISO string. */
export function toIso(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "" && !/^\d+(\.\d+)?$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  const n = asNumber(value);
  if (n === undefined) return undefined;
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}
