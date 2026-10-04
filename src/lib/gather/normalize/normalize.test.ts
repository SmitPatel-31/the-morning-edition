import { describe, expect, it } from "vitest";
import { normalizeCalendar } from "./calendar";
import { normalizeGithub, repoFromUrl } from "./github";
import { displaySender, normalizeGmail } from "./gmail";
import { mergeSlack, normalizeSlackHistory, normalizeSlackSearch, slackToPlain } from "./slack";
import { clean, toIso } from "./util";

// Fixtures mirror the shapes the pinned Composio tool versions return,
// with synthetic content.

describe("util", () => {
  it("decodes entities, collapses whitespace and trims with an ellipsis", () => {
    expect(clean("It&#39;s   a\r\n test &amp; more", 100)).toBe("It's a test & more");
    expect(clean("abcdefghij", 5)).toBe("abcd…");
  });

  it("parses ISO strings and epoch seconds", () => {
    expect(toIso("2026-10-03T12:00:00Z")).toBe("2026-10-03T12:00:00.000Z");
    expect(toIso("1791072000.000200")).toBe(new Date(1791072000000).toISOString());
    expect(toIso("not a date")).toBeUndefined();
  });
});

describe("normalizeGmail", () => {
  const data = {
    messages: [
      {
        messageId: "m1",
        sender: '"Dana Reyes" <dana@acme.test>',
        subject: "Contract redlines before Friday",
        preview: { subject: "Contract redlines", body: "Can you look at clause 4? Legal needs it by Friday." },
        messageText: "full body that should not be used when a preview exists",
        messageTimestamp: "2026-10-03T09:15:00Z",
        labelIds: ["UNREAD", "IMPORTANT", "INBOX"],
        display_url: "https://mail.google.com/mail/u/0/#inbox/m1",
      },
      {
        messageId: "m2",
        sender: "deals@shop.test",
        subject: "48 hour sale",
        labelIds: ["CATEGORY_PROMOTIONS", "INBOX"],
        messageTimestamp: "2026-10-03T10:00:00Z",
      },
      { sender: "no id, dropped" },
    ],
  };

  it("keeps subject, sender and snippet, and drops promotions", () => {
    const items = normalizeGmail(data);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "gmail:m1",
      from: "Dana Reyes",
      subject: "Contract redlines before Friday",
      snippet: "Can you look at clause 4? Legal needs it by Friday.",
      unread: true,
      important: true,
      url: "https://mail.google.com/mail/u/0/#inbox/m1",
    });
  });

  it("tolerates a missing or malformed payload", () => {
    expect(normalizeGmail(undefined)).toEqual([]);
    expect(normalizeGmail({ messages: "nope" })).toEqual([]);
  });

  it("formats senders", () => {
    expect(displaySender("Google <no-reply@accounts.google.com>")).toBe("Google");
    expect(displaySender("plain@x.test")).toBe("plain@x.test");
  });
});

describe("normalizeCalendar", () => {
  const data = {
    items: [
      {
        id: "e2",
        summary: "Design review",
        start: { dateTime: "2026-10-03T15:00:00-04:00" },
        end: { dateTime: "2026-10-03T16:00:00-04:00" },
        organizer: { email: "lee@acme.test", displayName: "Lee" },
        attendees: [{ email: "me@acme.test", self: true, responseStatus: "accepted" }, { email: "lee@acme.test" }],
        htmlLink: "https://calendar.google.com/event?eid=e2",
      },
      { id: "e1", summary: "Offsite", start: { date: "2026-10-03" }, end: { date: "2026-10-04" } },
      { id: "e3", summary: "Cancelled sync", status: "cancelled", start: { dateTime: "2026-10-03T10:00:00Z" } },
      {
        id: "e4",
        summary: "Declined",
        start: { dateTime: "2026-10-03T11:00:00Z" },
        attendees: [{ self: true, responseStatus: "declined" }],
      },
    ],
  };

  it("sorts by start, marks all-day events, and drops cancelled or declined ones", () => {
    const items = normalizeCalendar(data);
    expect(items.map((e) => e.id)).toEqual(["googlecalendar:e1", "googlecalendar:e2"]);
    expect(items[0].allDay).toBe(true);
    expect(items[1]).toMatchObject({
      title: "Design review",
      start: "2026-10-03T19:00:00.000Z",
      organizer: "Lee",
      attendeeCount: 2,
    });
  });
});

describe("normalizeGithub", () => {
  const data = {
    total_count: 3,
    items: [
      {
        number: 42,
        title: "Add retry to webhook sender",
        html_url: "https://github.com/acme/web/pull/42",
        repository_url: "https://api.github.com/repos/acme/web",
        user: { login: "octo" },
        pull_request: { html_url: "https://github.com/acme/web/pull/42" },
        created_at: "2026-10-01T12:00:00Z",
        updated_at: "2026-10-02T12:00:00Z",
        comments: 3,
        draft: false,
      },
      {
        number: 7,
        title: "An issue, not a PR",
        html_url: "https://github.com/acme/web/issues/7",
        repository_url: "https://api.github.com/repos/acme/web",
      },
      {
        number: 9,
        title: "Older PR",
        html_url: "https://github.com/acme/api/pull/9",
        user: { login: "mona" },
        created_at: "2026-09-28T12:00:00Z",
      },
    ],
  };

  it("keeps only pull requests, oldest request first", () => {
    const items = normalizeGithub(data);
    expect(items.map((p) => p.id)).toEqual(["github:acme/api#9", "github:acme/web#42"]);
    expect(items[1]).toMatchObject({ repo: "acme/web", number: 42, author: "octo", comments: 3 });
  });

  it("parses repos from API and web URLs", () => {
    expect(repoFromUrl("https://api.github.com/repos/a/b")).toBe("a/b");
    expect(repoFromUrl("https://github.com/a/b/pull/1")).toBe("a/b");
    expect(repoFromUrl("https://example.com")).toBeUndefined();
  });
});

describe("slack", () => {
  const me = "U0ME";

  it("rewrites Slack markup to plain text", () => {
    expect(slackToPlain("hey <@U0ME>, see <#C1|launch> and <https://x.test|the doc> <!here>", me)).toBe(
      "hey @you, see #launch and the doc @here",
    );
  });

  it("normalizes search matches and flags mentions and DMs", () => {
    const items = normalizeSlackSearch(
      {
        messages: {
          matches: [
            {
              ts: "1791072000.000100",
              text: "<@U0ME> can you approve the deploy?",
              username: "sam",
              channel: { id: "C1", name: "deploys" },
              permalink: "https://acme.slack.com/archives/C1/p1",
            },
            { ts: "1791072100.000100", text: "lunch?", user: "U9", channel: { id: "D1", name: "U9" } },
          ],
        },
      },
      me,
    );
    expect(items[0]).toMatchObject({ channel: "#deploys", author: "sam", mentionsMe: true, text: "@you can you approve the deploy?" });
    expect(items[1]).toMatchObject({ channel: "direct message", mentionsMe: true });
  });

  it("skips housekeeping messages in channel history", () => {
    const items = normalizeSlackHistory(
      {
        messages: [
          { ts: "1791072000.1", text: "Shipped v2", user_profile: { display_name: "kai" } },
          { ts: "1791072001.1", text: "<@U2> has joined the channel", subtype: "channel_join" },
        ],
      },
      { id: "C2", name: "general" },
      me,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ channel: "#general", author: "kai", mentionsMe: false });
  });

  it("merges duplicates and puts mentions first", () => {
    const base = { kind: "slack" as const, channel: "#a", author: "x", text: "t" };
    const merged = mergeSlack(
      [{ ...base, id: "s:1", postedAt: "2026-10-03T10:00:00Z", mentionsMe: false }],
      [
        { ...base, id: "s:1", postedAt: "2026-10-03T10:00:00Z", mentionsMe: true, url: "u" },
        { ...base, id: "s:2", postedAt: "2026-10-03T11:00:00Z", mentionsMe: false },
      ],
    );
    expect(merged.map((m) => m.id)).toEqual(["s:1", "s:2"]);
    expect(merged[0]).toMatchObject({ mentionsMe: true, url: "u" });
  });
});
