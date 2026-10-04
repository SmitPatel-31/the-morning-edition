import type { PullRequestItem } from "../types";
import { asArray, asNumber, asString, clean, get, toIso } from "./util";

/** "https://api.github.com/repos/acme/web" or ".../acme/web/pull/12" → "acme/web". */
export function repoFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const api = url.match(/\/repos\/([^/]+\/[^/]+)/);
  if (api) return api[1];
  const web = url.match(/github\.com\/([^/]+\/[^/]+)\/(?:pull|issues)\//);
  return web?.[1];
}

/**
 * GITHUB_SEARCH_ISSUES_AND_PULL_REQUESTS → PullRequestItem[]. The search
 * endpoint returns issues and PRs together, so anything without a
 * `pull_request` link or a /pull/ URL is dropped.
 */
export function normalizeGithub(data: unknown): PullRequestItem[] {
  const items: PullRequestItem[] = [];
  for (const raw of asArray(get(data, "items"))) {
    const htmlUrl = asString(get(raw, "html_url"));
    const isPr = get(raw, "pull_request") !== undefined || htmlUrl?.includes("/pull/");
    if (!isPr || !htmlUrl) continue;

    const number = asNumber(get(raw, "number"));
    const repo = repoFromUrl(asString(get(raw, "repository_url"))) ?? repoFromUrl(htmlUrl);
    if (number === undefined || !repo) continue;

    items.push({
      kind: "pull_request",
      id: `github:${repo}#${number}`,
      title: clean(asString(get(raw, "title")) || "(untitled pull request)", 160),
      repo,
      number,
      author: asString(get(raw, "user", "login")) ?? "unknown",
      draft: get(raw, "draft") === true,
      createdAt: toIso(get(raw, "created_at")) ?? new Date(0).toISOString(),
      updatedAt: toIso(get(raw, "updated_at")) ?? new Date(0).toISOString(),
      comments: asNumber(get(raw, "comments")) ?? 0,
      url: htmlUrl,
    });
  }
  // Oldest requests first: the longer a review has waited, the more it matters.
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
