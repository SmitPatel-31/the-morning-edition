import { executeReadTool } from "@/lib/composio/readonly";
import { localDayBounds } from "@/lib/time";
import { normalizeCalendar } from "./normalize/calendar";
import { normalizeGithub } from "./normalize/github";
import { normalizeGmail } from "./normalize/gmail";
import { mergeSlack, normalizeSlackHistory, normalizeSlackSearch } from "./normalize/slack";
import { asString, get } from "./normalize/util";
import type { EmailItem, EventItem, GatherOptions, PullRequestItem, SlackItem } from "./types";

/**
 * One fetcher per source. Each makes direct, deterministic Composio read
 * calls (the model is never involved in data collection) and returns
 * normalized items capped to a size the free Gemini tier handles quickly.
 */

const MAX_EMAILS = 20;
const MAX_PRS = 15;
const MAX_SLACK = 25;

export async function fetchGmail(userId: string, _opts: GatherOptions, signal: AbortSignal): Promise<EmailItem[]> {
  const data = await executeReadTool(
    "GMAIL_FETCH_EMAILS",
    userId,
    {
      query: "newer_than:1d in:inbox -category:promotions -category:social",
      max_results: 40,
      include_payload: false,
      verbose: false,
    },
    signal,
  );
  return normalizeGmail(data).slice(0, MAX_EMAILS);
}

export async function fetchCalendar(userId: string, opts: GatherOptions, signal: AbortSignal): Promise<EventItem[]> {
  const { start, end } = localDayBounds(opts.timezone, opts.now);
  const data = await executeReadTool(
    "GOOGLECALENDAR_EVENTS_LIST",
    userId,
    {
      calendarId: "primary",
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      timeZone: opts.timezone,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    },
    signal,
  );
  return normalizeCalendar(data);
}

export async function fetchGithub(userId: string, _opts: GatherOptions, signal: AbortSignal): Promise<PullRequestItem[]> {
  const data = await executeReadTool(
    "GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS",
    userId,
    { q: "is:pr is:open review-requested:@me archived:false", per_page: 30, sort: "created", order: "asc" },
    signal,
  );
  return normalizeGithub(data).slice(0, MAX_PRS);
}

/**
 * Slack: who am I (for mention detection), then a search of the last day's
 * messages plus the history of any channels the reader picked. Search needs
 * a user token with `search:read`; if it fails, the chosen channels alone
 * still make a section.
 */
export async function fetchSlack(userId: string, opts: GatherOptions, signal: AbortSignal): Promise<SlackItem[]> {
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const auth = await executeReadTool("SLACK_TEST_AUTH", userId, {}, signal);
  const myUserId = asString(get(auth, "user_id"));

  const yesterday = since.toISOString().slice(0, 10);
  const searches = myUserId
    ? [
        executeReadTool(
          "SLACK_SEARCH_MESSAGES",
          userId,
          { query: `<@${myUserId}> after:${yesterday}`, sort: "timestamp", sort_dir: "desc", count: 30 },
          signal,
        ).then((d) => normalizeSlackSearch(d, myUserId)),
        executeReadTool(
          "SLACK_SEARCH_MESSAGES",
          userId,
          { query: `to:me after:${yesterday}`, sort: "timestamp", sort_dir: "desc", count: 30 },
          signal,
        ).then((d) => normalizeSlackSearch(d, myUserId)),
      ]
    : [];

  const histories = opts.slackChannels.map((channel) =>
    executeReadTool(
      "SLACK_FETCH_CONVERSATION_HISTORY",
      userId,
      { channel: channel.id, oldest: String(Math.floor(since.getTime() / 1000)), limit: 40 },
      signal,
    ).then((d) => normalizeSlackHistory(d, channel, myUserId)),
  );

  const settled = await Promise.allSettled([...searches, ...histories]);
  const lists = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (lists.length === 0 && settled.length > 0) {
    const first = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw first?.reason ?? new Error("Slack returned nothing");
  }

  const sinceIso = since.toISOString();
  return mergeSlack(...lists)
    .filter((m) => m.postedAt >= sinceIso)
    .slice(0, MAX_SLACK);
}

/** Channels for the settings picker. */
export async function listSlackChannels(userId: string): Promise<{ id: string; name: string }[]> {
  const data = await executeReadTool("SLACK_LIST_ALL_CHANNELS", userId, {
    types: "public_channel,private_channel",
    exclude_archived: true,
    limit: 200,
  });
  const channels = get(data, "channels");
  if (!Array.isArray(channels)) return [];
  return channels
    .map((c) => ({ id: asString(get(c, "id")), name: asString(get(c, "name")) }))
    .filter((c): c is { id: string; name: string } => Boolean(c.id && c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}
