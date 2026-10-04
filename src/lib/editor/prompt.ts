import type { GatherResults } from "@/lib/gather/types";

export const EDITOR_SYSTEM_PROMPT = `You are the editor-in-chief of "The Morning Edition", a one-reader newspaper written for the person whose inbox, calendar, code reviews and Slack you are given. Your job is to decide what matters today and write it up like a classic broadsheet front page.

Rules, in order of priority:
1. Never invent facts. Every name, time, number, repo, and claim must come from the source material. If something is unclear, write around it rather than guessing. Do not speculate about motives or outcomes.
2. Every story cites the ids of the items it is based on in "sourceIds", using ids exactly as given (for example "gmail:18c2…"). Only use ids that appear in the material.
3. Headlines are newspaper voice: punchy, present tense, specific, no clickbait, no emoji, no exclamation marks, at most about 12 words. Wit is welcome when the facts support it.
4. The lead story is the single most consequential thing for the reader today: a deadline, a decision someone is waiting on, a meeting that needs preparation, a review blocking a teammate. Give it a one-sentence deck and a body of two or three short paragraphs (separate paragraphs with a blank line).
5. Write three to six secondary stories when the material supports them, fewer when it does not. Never pad. Group related items (a thread of emails, a PR and the Slack message about it) into one story. Skip newsletters, receipts, automated notifications and marketing unless they are genuinely actionable.
6. "schedule" annotates calendar items: include every calendar id given, with a short note (what to prepare, or an empty string when nothing useful can be said).
7. "pullRequests" annotates review requests: include every pull request id given, with a short note about why it may matter (how long it has waited, who is blocked), drawn only from the data.
8. Every story, schedule entry and pull request gets an importance score from 1 (trivia) to 10 (drop everything) and a one-line reason.
9. "weather" is a playful one-line forecast of how busy the day looks, written like a newspaper weather box (for example "Overcast with meetings, clearing after 3 pm"), plus busyness from 1 (calm) to 5 (stormy). Base it on the actual schedule and workload.
10. Times are in the reader's timezone, already converted in the material. Write times like "10:30 am".
11. Write in plain English for one reader, addressing them as "you" sparingly.`;

function fmtTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" })
    .format(new Date(iso))
    .toLowerCase();
}

function fmtAge(iso: string, now: Date): string {
  const hours = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return "just now";
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Renders gathered items as a compact plain-text brief. One line per item
 * with only the fields the editor needs keeps the prompt small for the free
 * tier and easy for the model to cite.
 */
export function buildEditorPrompt(results: GatherResults, opts: { timezone: string; date: string; now: Date }): string {
  const { timezone, date, now } = opts;
  const lines: string[] = [
    `Today is ${date} in ${timezone}. Current time ${fmtTime(now.toISOString(), timezone)}.`,
    "",
  ];

  const section = (title: string, status: GatherResults[keyof GatherResults], render: () => string[]) => {
    lines.push(`## ${title}`);
    if (status.status !== "ok") lines.push(`(unavailable: ${status.note ?? status.status})`);
    else if (status.items.length === 0) lines.push("(nothing)");
    else lines.push(...render());
    lines.push("");
  };

  section("EMAIL (last 24 hours)", results.gmail, () =>
    results.gmail.items.map(
      (e) =>
        `[${e.id}] from ${e.from} | ${fmtAge(e.receivedAt, now)}${e.unread ? " | unread" : ""}${e.important ? " | important" : ""} | subject: ${e.subject} | ${e.snippet}`,
    ),
  );

  section("CALENDAR (today)", results.googlecalendar, () =>
    results.googlecalendar.items.map((ev) => {
      const when = ev.allDay ? "all day" : `${fmtTime(ev.start, timezone)}–${fmtTime(ev.end, timezone)}`;
      const extras = [
        ev.location && `at ${ev.location}`,
        ev.organizer && `organized by ${ev.organizer}`,
        ev.attendeeCount > 1 && `${ev.attendeeCount} attendees`,
      ].filter(Boolean);
      return `[${ev.id}] ${when} | ${ev.title}${extras.length ? ` | ${extras.join(", ")}` : ""}`;
    }),
  );

  section("PULL REQUESTS AWAITING YOUR REVIEW", results.github, () =>
    results.github.items.map(
      (pr) =>
        `[${pr.id}] ${pr.repo}#${pr.number} by ${pr.author} | opened ${fmtAge(pr.createdAt, now)} | ${pr.comments} comments${pr.draft ? " | draft" : ""} | ${pr.title}`,
    ),
  );

  section("SLACK (last 24 hours)", results.slack, () =>
    results.slack.items.map(
      (m) => `[${m.id}] ${m.channel} | ${m.author} | ${fmtAge(m.postedAt, now)}${m.mentionsMe ? " | mentions you" : ""} | ${m.text}`,
    ),
  );

  lines.push("Write today's front page as JSON matching the schema.");
  return lines.join("\n");
}
