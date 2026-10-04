import type { Source } from "@/lib/composio/toolkits";

/**
 * Normalized items: the compact, source-agnostic shape the editor sees.
 * Every item has a stable `id` (prefixed with its source) that the edition
 * uses to point back at the original email, event, PR, or message.
 */

export interface EmailItem {
  kind: "email";
  id: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  unread: boolean;
  important: boolean;
  url: string;
}

export interface EventItem {
  kind: "event";
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  organizer?: string;
  attendeeCount: number;
  url?: string;
}

export interface PullRequestItem {
  kind: "pull_request";
  id: string;
  title: string;
  repo: string;
  number: number;
  author: string;
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  comments: number;
  url: string;
}

export interface SlackItem {
  kind: "slack";
  id: string;
  channel: string;
  author: string;
  text: string;
  postedAt: string;
  mentionsMe: boolean;
  url?: string;
}

export type SourceItem = EmailItem | EventItem | PullRequestItem | SlackItem;

export type SourceItemsBySource = {
  gmail: EmailItem[];
  googlecalendar: EventItem[];
  github: PullRequestItem[];
  slack: SlackItem[];
};

export type GatherStatus = "ok" | "not_connected" | "error" | "skipped";

export interface SourceResult<S extends Source = Source> {
  source: S;
  status: GatherStatus;
  items: SourceItemsBySource[S];
  /** Short, reader-safe explanation when status is not "ok". */
  note?: string;
  ms: number;
}

export type GatherResults = { [S in Source]: SourceResult<S> };

export interface GatherOptions {
  timezone: string;
  /** Slack channels to read in full, in addition to mentions. */
  slackChannels: { id: string; name: string }[];
  /** Sources the reader turned off in settings. */
  disabledSources: Source[];
  now?: Date;
}
