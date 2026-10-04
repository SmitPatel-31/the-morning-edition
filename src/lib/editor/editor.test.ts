import { ApiError } from "@google/genai";
import { describe, expect, it, vi } from "vitest";
import { assembleEdition } from "@/lib/edition/assemble";
import { EditionSchema } from "@/lib/edition/types";
import type { GatherResults } from "@/lib/gather/types";
import { EditorBusyError, retryDelayFromError, withBackoff } from "./gemini";
import { buildEditorPrompt } from "./prompt";
import { EditorOutputSchema, editorJsonSchema, type EditorOutput } from "./schema";

const results: GatherResults = {
  gmail: {
    source: "gmail",
    status: "ok",
    ms: 10,
    items: [
      {
        kind: "email",
        id: "gmail:m1",
        from: "Dana Reyes",
        subject: "Contract redlines before Friday",
        snippet: "Legal needs clause 4 by Friday.",
        receivedAt: "2026-10-03T09:15:00.000Z",
        unread: true,
        important: true,
        url: "https://mail.google.com/mail/u/0/#inbox/m1",
      },
    ],
  },
  googlecalendar: {
    source: "googlecalendar",
    status: "ok",
    ms: 10,
    items: [
      {
        kind: "event",
        id: "googlecalendar:e1",
        title: "Design review",
        start: "2026-10-03T19:00:00.000Z",
        end: "2026-10-03T20:00:00.000Z",
        allDay: false,
        attendeeCount: 4,
      },
    ],
  },
  github: {
    source: "github",
    status: "ok",
    ms: 10,
    items: [
      {
        kind: "pull_request",
        id: "github:acme/web#42",
        title: "Add retry to webhook sender",
        repo: "acme/web",
        number: 42,
        author: "octo",
        draft: false,
        createdAt: "2026-10-01T12:00:00.000Z",
        updatedAt: "2026-10-02T12:00:00.000Z",
        comments: 2,
        url: "https://github.com/acme/web/pull/42",
      },
    ],
  },
  slack: { source: "slack", status: "not_connected", ms: 0, items: [], note: "Not connected" },
};

const output: EditorOutput = {
  lead: {
    headline: "Legal Wants Clause Four by Friday",
    deck: "Dana Reyes needs your redlines before the week is out.",
    body: "Dana Reyes wrote this morning asking for redlines on clause 4.\n\nLegal needs them by Friday.",
    section: "Inbox",
    sourceIds: ["gmail:m1"],
    importance: 9,
    importanceReason: "Hard deadline with legal",
  },
  stories: [
    {
      headline: "Webhook Retry Patch Waits Two Days for Review",
      body: "octo's retry change to acme/web has been open since Thursday.",
      section: "Code Review",
      sourceIds: ["github:acme/web#42", "github:made-up#1"],
      importance: 6,
      importanceReason: "Teammate blocked",
    },
    {
      headline: "Invented Story",
      body: "This cites nothing that exists and must be dropped.",
      section: "Slack",
      sourceIds: ["slack:fake"],
      importance: 8,
      importanceReason: "Made up",
    },
  ],
  schedule: [
    { sourceId: "googlecalendar:e1", note: "Bring the mocks", importance: 5, importanceReason: "Four attendees" },
    { sourceId: "googlecalendar:ghost", note: "Not real", importance: 9, importanceReason: "Made up" },
  ],
  pullRequests: [{ sourceId: "github:acme/web#42", note: "Open two days", importance: 6, importanceReason: "Blocking" }],
  weather: { forecast: "Sunny morning, one meeting rolling in at 3 pm", busyness: 2 },
};

const meta = { editionNumber: 7, date: "2026-10-03", timezone: "America/New_York", model: "test", now: new Date("2026-10-03T12:00:00Z") };

describe("EditorOutputSchema", () => {
  it("accepts a well-formed front page", () => {
    expect(EditorOutputSchema.safeParse(output).success).toBe(true);
  });

  it("rejects stories without sources, out-of-range scores, and too many stories", () => {
    const noSources = structuredClone(output);
    noSources.lead.sourceIds = [];
    expect(EditorOutputSchema.safeParse(noSources).success).toBe(false);

    const badScore = structuredClone(output);
    badScore.stories[0].importance = 11;
    expect(EditorOutputSchema.safeParse(badScore).success).toBe(false);

    const tooMany = structuredClone(output);
    tooMany.stories = Array(7).fill(output.stories[0]);
    expect(EditorOutputSchema.safeParse(tooMany).success).toBe(false);
  });

  it("produces a JSON schema Gemini can take", () => {
    const schema = editorJsonSchema();
    expect(schema.type).toBe("object");
    expect(schema.$schema).toBeUndefined();
    expect(Object.keys(schema.properties as object)).toEqual(["lead", "stories", "schedule", "pullRequests", "weather"]);
  });
});

describe("assembleEdition", () => {
  const edition = assembleEdition(output, results, meta);

  it("produces a valid stored edition", () => {
    expect(EditionSchema.safeParse(edition).success).toBe(true);
  });

  it("drops invented sources and stories that cite nothing real", () => {
    expect(edition.stories).toHaveLength(1);
    expect(edition.stories[0].sourceIds).toEqual(["github:acme/web#42"]);
  });

  it("builds schedule and PR list from data, ignoring invented entries", () => {
    expect(edition.schedule.map((s) => s.sourceId)).toEqual(["googlecalendar:e1"]);
    expect(edition.schedule[0]).toMatchObject({ title: "Design review", note: "Bring the mocks" });
    expect(edition.pullRequests[0]).toMatchObject({ number: 42, note: "Open two days" });
  });

  it("records references for linking back and the status of each source", () => {
    expect(edition.references["gmail:m1"].url).toBe("https://mail.google.com/mail/u/0/#inbox/m1");
    expect(edition.references["slack:fake"]).toBeUndefined();
    expect(edition.sources.slack).toEqual({ status: "not_connected", count: 0, note: "Not connected" });
  });

  it("promotes the strongest story when the lead cites nothing real", () => {
    const bad = structuredClone(output);
    bad.lead.sourceIds = ["gmail:nope"];
    const e = assembleEdition(bad, results, meta);
    expect(e.lead?.headline).toBe("Webhook Retry Patch Waits Two Days for Review");
    expect(e.stories).toHaveLength(0);
  });
});

describe("buildEditorPrompt", () => {
  it("lists every item id and marks unavailable sources", () => {
    const prompt = buildEditorPrompt(results, { timezone: "America/New_York", date: "2026-10-03", now: meta.now });
    expect(prompt).toContain("[gmail:m1]");
    expect(prompt).toContain("[googlecalendar:e1] 3:00 pm–4:00 pm | Design review");
    expect(prompt).toContain("[github:acme/web#42] acme/web#42 by octo | opened 2d ago");
    expect(prompt).toContain("(unavailable: Not connected)");
  });
});

describe("withBackoff", () => {
  const rateLimited = (message = "quota") => new ApiError({ message, status: 429 });

  it("retries 429s and then succeeds", async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(rateLimited()).mockResolvedValueOnce("ok");
    const onRetry = vi.fn();
    const promise = withBackoff(fn, onRetry);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe("ok");
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number));
    vi.useRealTimers();
  });

  it("gives up with a friendly error when the suggested wait is too long", async () => {
    const fn = vi.fn().mockRejectedValue(rateLimited('{"retryDelay": "45s"}'));
    await expect(withBackoff(fn)).rejects.toBeInstanceOf(EditorBusyError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not retry other errors", async () => {
    const fn = vi.fn().mockRejectedValue(new ApiError({ message: "bad", status: 400 }));
    await expect(withBackoff(fn)).rejects.toThrow("bad");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("reads Google's retry hint", () => {
    expect(retryDelayFromError(new Error('"retryDelay": "23s"'))).toBe(23_000);
    expect(retryDelayFromError(new Error("nothing"))).toBeUndefined();
  });
});
