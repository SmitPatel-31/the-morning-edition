/**
 * The four apps the paper reads from, and the only Composio tools the app is
 * allowed to execute. This file is the read-only guarantee in code form:
 * `executeReadTool` refuses any slug not listed here.
 */

export const SOURCES = ["gmail", "googlecalendar", "github", "slack"] as const;
export type Source = (typeof SOURCES)[number];

export const SOURCE_LABELS: Record<Source, string> = {
  gmail: "Gmail",
  googlecalendar: "Google Calendar",
  github: "GitHub",
  slack: "Slack",
};

/**
 * Every tool the app may call, per toolkit. All of them carry Composio's
 * `readOnlyHint` tag; `executeReadTool` double-checks that at runtime.
 */
export const READ_TOOLS = {
  gmail: ["GMAIL_FETCH_EMAILS"],
  googlecalendar: ["GOOGLECALENDAR_EVENTS_LIST"],
  github: ["GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS"],
  slack: [
    "SLACK_TEST_AUTH",
    "SLACK_SEARCH_MESSAGES",
    "SLACK_FETCH_CONVERSATION_HISTORY",
    "SLACK_LIST_ALL_CHANNELS",
  ],
} as const satisfies Record<Source, readonly string[]>;

export type ReadToolSlug = (typeof READ_TOOLS)[Source][number];

const ALLOWED = new Set<string>(Object.values(READ_TOOLS).flat());

export function isAllowedReadTool(slug: string): slug is ReadToolSlug {
  return ALLOWED.has(slug);
}

export function toolkitOf(slug: ReadToolSlug): Source {
  for (const source of SOURCES) {
    if ((READ_TOOLS[source] as readonly string[]).includes(slug)) return source;
  }
  throw new Error(`Unknown tool ${slug}`);
}

/**
 * Toolkit versions are pinned so a Composio release can't silently change a
 * response shape under the normalizers. `tools.execute` also refuses to run
 * against "latest" without an explicit opt-out, so pinning is required anyway.
 */
export const TOOLKIT_VERSIONS: Record<Source, string> = {
  gmail: "20260915_00",
  googlecalendar: "20261001_00",
  github: "20260924_00",
  slack: "20261002_00",
};

/**
 * OAuth scopes requested when the app creates its own Composio-managed auth
 * config. Google has true read-only scopes, so the token itself can't write.
 * GitHub and Slack have no equivalent that still covers the reads we need, so
 * for those the tool allowlist is what keeps the app read-only.
 */
export const READ_ONLY_SCOPES: Partial<Record<Source, string[]>> = {
  gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
  googlecalendar: ["https://www.googleapis.com/auth/calendar.readonly"],
};
