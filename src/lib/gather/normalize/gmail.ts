import type { EmailItem } from "../types";
import { asArray, asString, clean, get, toIso } from "./util";

const NOISE_LABELS = new Set(["CATEGORY_PROMOTIONS", "CATEGORY_SOCIAL", "SPAM", "TRASH"]);

/** Strips the address from "Name <addr@x.com>" when a display name exists. */
export function displaySender(sender: string): string {
  const match = sender.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return (match?.[1] ?? sender).trim();
}

/**
 * GMAIL_FETCH_EMAILS → EmailItem[]. Keeps subject, sender, and a short
 * snippet only; full bodies never reach the editor. Promotions and social
 * mail are dropped before the model sees them.
 */
export function normalizeGmail(data: unknown): EmailItem[] {
  const items: EmailItem[] = [];
  for (const raw of asArray(get(data, "messages"))) {
    const id = asString(get(raw, "messageId"));
    if (!id) continue;

    const labels = asArray(get(raw, "labelIds")).filter((l): l is string => typeof l === "string");
    if (labels.some((l) => NOISE_LABELS.has(l))) continue;

    const subject = asString(get(raw, "subject")) ?? asString(get(raw, "preview", "subject"));
    const snippet =
      asString(get(raw, "preview", "body")) ?? asString(get(raw, "messageText")) ?? "";

    items.push({
      kind: "email",
      id: `gmail:${id}`,
      from: clean(displaySender(asString(get(raw, "sender")) ?? "Unknown sender"), 80),
      subject: clean(subject || "(no subject)", 140),
      snippet: clean(snippet, 240),
      receivedAt: toIso(get(raw, "messageTimestamp")) ?? new Date(0).toISOString(),
      unread: labels.includes("UNREAD"),
      important: labels.includes("IMPORTANT") || labels.includes("STARRED"),
      url: asString(get(raw, "display_url")) ?? `https://mail.google.com/mail/u/0/#inbox/${id}`,
    });
  }
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
}
