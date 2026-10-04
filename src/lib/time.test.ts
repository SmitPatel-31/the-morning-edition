import { describe, expect, it } from "vitest";
import { localDate, localDayBounds, tzOffsetMinutes } from "./time";

describe("time", () => {
  it("finds the local date across the UTC day boundary", () => {
    const lateEvening = new Date("2026-10-04T02:30:00Z"); // 22:30 on the 3rd in New York
    expect(localDate("America/New_York", lateEvening)).toBe("2026-10-03");
    expect(localDate("Asia/Kolkata", lateEvening)).toBe("2026-10-04");
  });

  it("computes offsets including DST", () => {
    expect(tzOffsetMinutes("America/New_York", new Date("2026-07-01T12:00:00Z"))).toBe(-240);
    expect(tzOffsetMinutes("America/New_York", new Date("2026-12-01T12:00:00Z"))).toBe(-300);
    expect(tzOffsetMinutes("Asia/Kolkata", new Date("2026-12-01T12:00:00Z"))).toBe(330);
  });

  it("returns the reader's local day as UTC bounds", () => {
    const { date, start, end } = localDayBounds("America/New_York", new Date("2026-10-03T15:00:00Z"));
    expect(date).toBe("2026-10-03");
    expect(start.toISOString()).toBe("2026-10-03T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-04T04:00:00.000Z");
  });

  it("handles a 23 hour day at the DST change", () => {
    const { start, end } = localDayBounds("America/New_York", new Date("2026-03-08T17:00:00Z"));
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });
});
