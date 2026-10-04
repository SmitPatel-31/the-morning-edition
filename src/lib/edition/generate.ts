import { SOURCES, type Source } from "@/lib/composio/toolkits";
import { editionNumberFor, saveEdition } from "@/lib/db/editions";
import type { Reader } from "@/lib/db/users";
import { EditorBusyError, runEditor } from "@/lib/editor/gemini";
import { buildEditorPrompt } from "@/lib/editor/prompt";
import type { EditorOutput } from "@/lib/editor/schema";
import { gatherAll, sourcesUsed } from "@/lib/gather";
import type { GatherResults, GatherStatus } from "@/lib/gather/types";
import { localDate } from "@/lib/time";
import { assembleEdition } from "./assemble";
import type { Edition } from "./types";

export type PressEvent =
  | { type: "stage"; stage: "gather" | "edit" | "publish"; message: string }
  | { type: "source"; source: Source; status: GatherStatus; count: number; note?: string }
  | { type: "notice"; message: string }
  | { type: "done"; date: string; editionNumber: number; ms: number }
  | { type: "error"; kind: "busy" | "failed"; message: string };

/**
 * Used when nothing was gathered, so Gemini isn't asked to write about
 * nothing. Its lead cites no real item, so grounding drops it and the
 * edition is stored with `lead: null`, which the front page renders as a
 * quiet-morning notice.
 */
const QUIET_DAY: EditorOutput = {
  lead: {
    headline: "Nothing to Report",
    deck: "No mail, meetings, reviews or mentions made it to the desk this morning.",
    body: "No mail, meetings, reviews or mentions made it to the desk this morning.",
    section: "Around the Office",
    sourceIds: ["none"],
    importance: 1,
    importanceReason: "Nothing gathered",
  },
  stories: [],
  schedule: [],
  pullRequests: [],
  weather: { forecast: "Clear skies. No meetings on the horizon.", busyness: 1 },
};

function totalItems(results: GatherResults): number {
  return SOURCES.reduce((n, s) => n + results[s].items.length, 0);
}

/**
 * Gather → edit → publish for one reader. Progress is reported through
 * `emit` so the UI can run its printing-press animation off real events.
 * Throws nothing: failures are reported as an `error` event and returned.
 */
export async function generateEdition(
  reader: Reader,
  emit: (event: PressEvent) => void = () => {},
  now: Date = new Date(),
): Promise<{ ok: true; edition: Edition } | { ok: false; error: string }> {
  const started = Date.now();
  try {
    const date = localDate(reader.timezone, now);
    emit({ type: "stage", stage: "gather", message: "Sending reporters to your apps" });

    const disabledSources = SOURCES.filter((s) => !reader.settings.sections[s]);
    const results = await gatherAll(
      reader.composioUserId,
      { timezone: reader.timezone, slackChannels: reader.settings.slackChannels, disabledSources, now },
      ({ source, result }) =>
        emit({ type: "source", source, status: result.status, count: result.items.length, note: result.note }),
    );

    let output: EditorOutput;
    let model: string;
    if (totalItems(results) === 0) {
      emit({ type: "stage", stage: "edit", message: "A quiet morning; the editor is setting a short page" });
      output = QUIET_DAY;
      model = "none";
    } else {
      emit({ type: "stage", stage: "edit", message: "The editor is choosing today's stories" });
      const brief = buildEditorPrompt(results, { timezone: reader.timezone, date, now });
      ({ output, model } = await runEditor(brief, {
        onRetry: (message) => emit({ type: "notice", message }),
      }));
    }

    emit({ type: "stage", stage: "publish", message: "Setting type and running the press" });
    const editionNumber = await editionNumberFor(reader.id, date);
    const edition = assembleEdition(output, results, {
      editionNumber,
      date,
      timezone: reader.timezone,
      model,
      now,
    });
    const ms = Date.now() - started;
    await saveEdition(reader.id, edition, { sourcesUsed: sourcesUsed(results), generationMs: ms });

    emit({ type: "done", date, editionNumber, ms });
    return { ok: true, edition };
  } catch (error) {
    console.error("[press] edition failed", error);
    const busy = error instanceof EditorBusyError;
    const message = busy
      ? error.message
      : "The press jammed while printing this edition. Nothing was lost; try again in a moment.";
    emit({ type: "error", kind: busy ? "busy" : "failed", message });
    return { ok: false, error: message };
  }
}
