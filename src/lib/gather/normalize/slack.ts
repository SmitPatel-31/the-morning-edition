import type { SlackItem } from "../types";
import { asArray, asString, clean, get, toIso } from "./util";

/**
 * Rewrites Slack markup into plain text: `<@U123>` → `@you` or `@someone`,
 * `<#C1|general>` → `#general`, `<https://x|label>` → `label`.
 */
export function slackToPlain(text: string, myUserId?: string): string {
  return text
    .replace(/<@([A-Z0-9]+)(?:\|([^>]+))?>/g, (_, id: string, label?: string) =>
      id === myUserId ? "@you" : `@${label ?? "someone"}`,
    )
    .replace(/<#[A-Z0-9]+\|([^>]+)>/g, "#$1")
    .replace(/<!(here|channel|everyone)>/g, "@$1")
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:[^>]+)>/g, "$1");
}

function mentions(text: string, myUserId?: string): boolean {
  return myUserId ? text.includes(`<@${myUserId}`) : false;
}

/** SLACK_SEARCH_MESSAGES → SlackItem[]. */
export function normalizeSlackSearch(data: unknown, myUserId?: string): SlackItem[] {
  const items: SlackItem[] = [];
  for (const match of asArray(get(data, "messages", "matches"))) {
    const ts = asString(get(match, "ts"));
    const channelId = asString(get(match, "channel", "id"));
    const rawText = asString(get(match, "text"));
    if (!ts || !channelId || !rawText) continue;

    const channelName = asString(get(match, "channel", "name"));
    const isDm = get(match, "channel", "is_im") === true || channelId.startsWith("D");
    items.push({
      kind: "slack",
      id: `slack:${channelId}:${ts}`,
      channel: isDm ? "direct message" : `#${channelName ?? channelId}`,
      author: asString(get(match, "username")) ?? asString(get(match, "user")) ?? "someone",
      text: clean(slackToPlain(rawText, myUserId), 280),
      postedAt: toIso(ts) ?? new Date(0).toISOString(),
      mentionsMe: mentions(rawText, myUserId) || isDm,
      url: asString(get(match, "permalink")),
    });
  }
  return items;
}

/** SLACK_FETCH_CONVERSATION_HISTORY for one channel → SlackItem[]. */
export function normalizeSlackHistory(
  data: unknown,
  channel: { id: string; name: string },
  myUserId?: string,
): SlackItem[] {
  const items: SlackItem[] = [];
  for (const message of asArray(get(data, "messages"))) {
    const ts = asString(get(message, "ts"));
    const rawText = asString(get(message, "text"));
    const subtype = asString(get(message, "subtype"));
    // Join/leave notices and similar housekeeping aren't news.
    if (!ts || !rawText || (subtype && subtype !== "thread_broadcast" && subtype !== "bot_message")) {
      continue;
    }
    items.push({
      kind: "slack",
      id: `slack:${channel.id}:${ts}`,
      channel: `#${channel.name}`,
      author:
        asString(get(message, "user_profile", "display_name")) ||
        asString(get(message, "user_profile", "real_name")) ||
        asString(get(message, "username")) ||
        asString(get(message, "user")) ||
        "someone",
      text: clean(slackToPlain(rawText, myUserId), 280),
      postedAt: toIso(ts) ?? new Date(0).toISOString(),
      mentionsMe: mentions(rawText, myUserId),
      url: `https://slack.com/app_redirect?channel=${channel.id}&message_ts=${ts}`,
    });
  }
  return items;
}

/** Merges search hits and channel history, de-duplicated, mentions first, newest first. */
export function mergeSlack(...lists: SlackItem[][]): SlackItem[] {
  const byId = new Map<string, SlackItem>();
  for (const item of lists.flat()) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, mentionsMe: existing.mentionsMe || item.mentionsMe, url: existing.url ?? item.url } : item);
  }
  return [...byId.values()].sort(
    (a, b) => Number(b.mentionsMe) - Number(a.mentionsMe) || b.postedAt.localeCompare(a.postedAt),
  );
}
