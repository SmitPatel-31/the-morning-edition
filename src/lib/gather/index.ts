import { listConnections } from "@/lib/composio/connections";
import { SOURCES, type Source } from "@/lib/composio/toolkits";
import { fetchCalendar, fetchGithub, fetchGmail, fetchSlack } from "./fetchers";
import type { GatherOptions, GatherResults, SourceItemsBySource, SourceResult } from "./types";

const FETCHERS: {
  [S in Source]: (userId: string, opts: GatherOptions, signal: AbortSignal) => Promise<SourceItemsBySource[S]>;
} = {
  gmail: fetchGmail,
  googlecalendar: fetchCalendar,
  github: fetchGithub,
  slack: fetchSlack,
};

const SOURCE_TIMEOUT_MS = 20_000;

export type GatherProgress = { source: Source; result: SourceResult };

function readerSafeError(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "Timed out";
  if (error instanceof Error && /401|403|unauthori[sz]ed|expired|revoked/i.test(error.message)) {
    return "Access expired. Reconnect this app in setup.";
  }
  return "Could not be reached this morning";
}

async function gatherOne<S extends Source>(
  source: S,
  userId: string,
  opts: GatherOptions,
): Promise<SourceResult<S>> {
  const started = Date.now();
  const signal = AbortSignal.timeout(SOURCE_TIMEOUT_MS);
  try {
    const items = await FETCHERS[source](userId, opts, signal);
    return { source, status: "ok", items, ms: Date.now() - started };
  } catch (error) {
    console.error(`[gather] ${source} failed`, error);
    return {
      source,
      status: "error",
      items: [] as SourceItemsBySource[S],
      note: readerSafeError(error),
      ms: Date.now() - started,
    };
  }
}

function emptyResult<S extends Source>(source: S, status: "not_connected" | "skipped", note: string): SourceResult<S> {
  return { source, status, items: [] as SourceItemsBySource[S], note, ms: 0 };
}

/**
 * Gathers every source in parallel. One app failing, timing out, or not
 * being connected never stops the others: its section is marked with a note
 * and the edition goes ahead with what arrived.
 */
export async function gatherAll(
  composioUserId: string,
  opts: GatherOptions,
  onProgress?: (progress: GatherProgress) => void,
): Promise<GatherResults> {
  const connections = await listConnections(composioUserId);
  const connected = new Set(connections.filter((c) => c.status === "connected").map((c) => c.source));

  const run = <S extends Source>(source: S): Promise<SourceResult<S>> => {
    const result: Promise<SourceResult<S>> = opts.disabledSources.includes(source)
      ? Promise.resolve(emptyResult(source, "skipped", "Section turned off in settings"))
      : !connected.has(source)
        ? Promise.resolve(emptyResult(source, "not_connected", "Not connected"))
        : gatherOne(source, composioUserId, opts);
    return result.then((r) => {
      onProgress?.({ source, result: r });
      return r;
    });
  };

  const [gmail, googlecalendar, github, slack] = await Promise.all([
    run("gmail"),
    run("googlecalendar"),
    run("github"),
    run("slack"),
  ]);
  return { gmail, googlecalendar, github, slack };
}

export function sourcesUsed(results: GatherResults): Source[] {
  return SOURCES.filter((s) => results[s].status === "ok");
}
