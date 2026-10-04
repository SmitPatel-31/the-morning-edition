import type { Edition } from "./types";

/**
 * A synthetic edition for previewing the layout without connected apps or
 * API keys. Every person, company, and repo here is made up, and the page
 * that renders it says so.
 */
export const SAMPLE_EDITION: Edition = {
  version: 1,
  editionNumber: 42,
  date: "2026-10-03",
  timezone: "America/New_York",
  generatedAt: "2026-10-03T10:42:00.000Z",
  model: "sample",
  weather: { forecast: "Meetings rolling in by late morning, clearing after 4 pm", busyness: 4 },
  lead: {
    headline: "Legal Wants Clause Four Settled by Friday, and the Pen Is in Your Hand",
    deck: "Dana Reyes says the Halcyon contract can't move until your redlines land; the counterparty's lawyers are already waiting.",
    section: "Inbox",
    body:
      "Dana Reyes wrote at 8:12 this morning with a short request and a firm date: the Halcyon services agreement is held up on clause 4, the limitation of liability, and legal needs your redlines before Friday's call with the other side.\n\n" +
      "The thread has picked up two replies since. Marcus Bell from finance added that the cap figure in the current draft doesn't match the number approved last quarter, and asked that it be fixed in the same pass.\n\n" +
      "Nothing else on today's desk has a hard external deadline attached. If one thing gets done before lunch, the desk recommends it be this.",
    sourceIds: ["gmail:s1", "gmail:s2"],
    importance: 9,
    importanceReason: "External deadline Friday; two colleagues blocked on it",
  },
  stories: [
    {
      headline: "Webhook Retry Fix Has Waited Three Days for Your Eyes",
      section: "Code Review",
      body: "Priya Nair's change to add exponential retries to the webhook sender in northwind/api has been open since Wednesday, and she pinged #platform last night asking whether anyone had cycles. You are the only requested reviewer.",
      sourceIds: ["github:northwind/api#418", "slack:C2:1791000000.1"],
      importance: 7,
      importanceReason: "A teammate is blocked and asked publicly",
    },
    {
      headline: "Design Review Moves to 2 pm, Mocks Due Beforehand",
      section: "Calendar",
      body: "Lee Okafor pushed the onboarding design review back an hour and asked attendees to look over the Figma link in the invite first. Six people are on the invite.",
      sourceIds: ["googlecalendar:s3", "gmail:s4"],
      importance: 6,
      importanceReason: "Prep requested before a six-person meeting",
    },
    {
      headline: "Deploy Freeze Starts Tonight at Nine",
      section: "Slack",
      body: "Release management announced in #eng-announce that the weekend freeze begins at 9 pm Eastern. Anything that needs to ship before Monday should be merged by then.",
      sourceIds: ["slack:C1:1791010000.2"],
      importance: 6,
      importanceReason: "Sets a cutoff for anything you want shipped",
    },
    {
      headline: "Quarterly Access Review Lands in Your Queue",
      section: "Inbox",
      body: "IT sent the quarterly access review for the three systems you own. It is due at the end of next week, so there is no rush today.",
      sourceIds: ["gmail:s5"],
      importance: 3,
      importanceReason: "Routine, due next week",
    },
    {
      headline: "Sam Asks Whether Thursday's Retro Can Run Long",
      section: "Slack",
      body: "In a direct message, Sam Whitfield asked if you'd mind the team retro running fifteen minutes over to cover the incident from Tuesday.",
      sourceIds: ["slack:D1:1791020000.3"],
      importance: 4,
      importanceReason: "Direct question awaiting a yes or no",
    },
  ],
  schedule: [
    { sourceId: "googlecalendar:s6", title: "Team standup", start: "2026-10-03T13:30:00.000Z", end: "2026-10-03T13:45:00.000Z", allDay: false, note: "", importance: 3, importanceReason: "Daily routine" },
    { sourceId: "googlecalendar:s7", title: "1:1 with Jordan", start: "2026-10-03T15:00:00.000Z", end: "2026-10-03T15:30:00.000Z", allDay: false, note: "Bring up the Halcyon timeline", importance: 5, importanceReason: "Good moment to flag the contract" },
    { sourceId: "googlecalendar:s3", title: "Onboarding design review", start: "2026-10-03T18:00:00.000Z", end: "2026-10-03T19:00:00.000Z", allDay: false, location: "Room 4B", note: "Review the Figma mocks first", importance: 6, importanceReason: "Prep requested" },
    { sourceId: "googlecalendar:s8", title: "Vendor call: Halcyon", start: "2026-10-03T19:30:00.000Z", end: "2026-10-03T20:00:00.000Z", allDay: false, note: "Clause 4 will come up", importance: 8, importanceReason: "Ties to the lead story" },
  ],
  pullRequests: [
    { sourceId: "github:northwind/api#418", title: "Add exponential retry to webhook sender", repo: "northwind/api", number: 418, author: "pnair", url: "#", createdAt: "2026-09-30T14:00:00.000Z", draft: false, note: "Open three days; author asked for review in Slack", importance: 7, importanceReason: "Blocking a teammate" },
    { sourceId: "github:northwind/web#1022", title: "Migrate settings page to new form components", repo: "northwind/web", number: 1022, author: "kchen", url: "#", createdAt: "2026-10-02T16:00:00.000Z", draft: false, note: "Large diff, 38 files", importance: 4, importanceReason: "Not urgent" },
    { sourceId: "github:northwind/infra#77", title: "Bump Postgres to 17.2 in staging", repo: "northwind/infra", number: 77, author: "dbot", url: "#", createdAt: "2026-10-03T09:00:00.000Z", draft: true, note: "Still a draft", importance: 2, importanceReason: "Draft" },
  ],
  sources: {
    gmail: { status: "ok", count: 14 },
    googlecalendar: { status: "ok", count: 4 },
    github: { status: "ok", count: 3 },
    slack: { status: "ok", count: 9 },
  },
  references: {
    "gmail:s1": { kind: "email", label: "Email from Dana Reyes: Halcyon clause 4 redlines", url: "#" },
    "gmail:s2": { kind: "email", label: "Email from Marcus Bell: Re: Halcyon clause 4", url: "#" },
    "gmail:s4": { kind: "email", label: "Email from Lee Okafor: Updated invite", url: "#" },
    "gmail:s5": { kind: "email", label: "Email from IT: Quarterly access review", url: "#" },
    "googlecalendar:s3": { kind: "event", label: "Calendar: Onboarding design review", url: "#" },
    "github:northwind/api#418": { kind: "pull_request", label: "northwind/api#418: Add exponential retry", url: "#" },
    "slack:C2:1791000000.1": { kind: "slack", label: "#platform, Priya Nair", url: "#" },
    "slack:C1:1791010000.2": { kind: "slack", label: "#eng-announce, Release Mgmt", url: "#" },
    "slack:D1:1791020000.3": { kind: "slack", label: "Direct message, Sam Whitfield", url: "#" },
  },
};
