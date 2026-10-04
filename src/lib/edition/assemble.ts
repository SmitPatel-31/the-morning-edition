import { SOURCES } from "@/lib/composio/toolkits";
import type { EditorOutput, EditorStory } from "@/lib/editor/schema";
import type { GatherResults, SourceItem } from "@/lib/gather/types";
import type { Edition, PullRequestEntry, ScheduleEntry, SourceRef, Story } from "./types";

function refFor(item: SourceItem): SourceRef {
  switch (item.kind) {
    case "email":
      return { kind: "email", label: `Email from ${item.from}: ${item.subject}`, url: item.url };
    case "event":
      return { kind: "event", label: `Calendar: ${item.title}`, url: item.url };
    case "pull_request":
      return { kind: "pull_request", label: `${item.repo}#${item.number}: ${item.title}`, url: item.url };
    case "slack":
      return { kind: "slack", label: `${item.channel}, ${item.author}`, url: item.url };
  }
}

function allItems(results: GatherResults): SourceItem[] {
  return [
    ...results.gmail.items,
    ...results.googlecalendar.items,
    ...results.github.items,
    ...results.slack.items,
  ];
}

/**
 * Keeps only source ids that exist in the gathered material. A story that
 * cites nothing real is dropped: it can't be linked back, and it may be
 * invented.
 */
function ground<T extends EditorStory>(story: T, known: Map<string, SourceItem>): T | null {
  const ids = [...new Set(story.sourceIds.filter((id) => known.has(id)))];
  return ids.length ? { ...story, sourceIds: ids } : null;
}

/**
 * Merges the editor's output with the gathered data into a stored edition.
 * The schedule and PR list come from the data itself; the model only
 * contributes notes and scores, so it cannot add or drop a meeting or PR.
 */
export function assembleEdition(
  output: EditorOutput,
  results: GatherResults,
  meta: { editionNumber: number; date: string; timezone: string; model: string; now: Date },
): Edition {
  const items = allItems(results);
  const known = new Map(items.map((i) => [i.id, i]));

  let lead: Story | null = ground(output.lead, known);
  let stories: Story[] = output.stories
    .map((s) => ground(s, known))
    .filter((s): s is EditorStory => s !== null);

  // If the lead cited nothing real, promote the most important story.
  if (!lead && stories.length) {
    stories = [...stories].sort((a, b) => b.importance - a.importance);
    [lead, ...stories] = stories;
  }

  const scheduleNotes = new Map(output.schedule.map((s) => [s.sourceId, s]));
  const schedule: ScheduleEntry[] = results.googlecalendar.items.map((ev) => {
    const note = scheduleNotes.get(ev.id);
    return {
      sourceId: ev.id,
      title: ev.title,
      start: ev.start,
      end: ev.end,
      allDay: ev.allDay,
      location: ev.location,
      url: ev.url,
      note: note?.note || undefined,
      importance: note?.importance,
      importanceReason: note?.importanceReason,
    };
  });

  const prNotes = new Map(output.pullRequests.map((p) => [p.sourceId, p]));
  const pullRequests: PullRequestEntry[] = results.github.items
    .map((pr) => {
      const note = prNotes.get(pr.id);
      return {
        sourceId: pr.id,
        title: pr.title,
        repo: pr.repo,
        number: pr.number,
        author: pr.author,
        url: pr.url,
        createdAt: pr.createdAt,
        draft: pr.draft,
        note: note?.note || undefined,
        importance: note?.importance,
        importanceReason: note?.importanceReason,
      };
    })
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0) || a.createdAt.localeCompare(b.createdAt));

  const cited = new Set([
    ...[lead, ...stories].flatMap((s) => s?.sourceIds ?? []),
    ...schedule.map((s) => s.sourceId),
    ...pullRequests.map((p) => p.sourceId),
  ]);
  const references: Record<string, SourceRef> = {};
  for (const id of cited) {
    const item = known.get(id);
    if (item) references[id] = refFor(item);
  }

  return {
    version: 1,
    editionNumber: meta.editionNumber,
    date: meta.date,
    timezone: meta.timezone,
    generatedAt: meta.now.toISOString(),
    model: meta.model,
    lead: lead ?? null,
    stories: stories.slice(0, 6),
    schedule,
    pullRequests,
    weather: output.weather,
    sources: Object.fromEntries(
      SOURCES.map((s) => [s, { status: results[s].status, count: results[s].items.length, note: results[s].note }]),
    ) as Edition["sources"],
    references,
  };
}
