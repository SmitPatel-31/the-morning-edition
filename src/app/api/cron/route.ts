import { NextResponse } from "next/server";
import { getEdition } from "@/lib/db/editions";
import { listReaders } from "@/lib/db/users";
import { generateEdition } from "@/lib/edition/generate";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { localDate } from "@/lib/time";

export const maxDuration = 300;

/** Stop starting new editions after this, leaving room for the last one to finish. */
const BUDGET_MS = 230_000;

/**
 * The morning print run, called by Vercel Cron with `Authorization: Bearer
 * $CRON_SECRET`. Prints today's edition (in each reader's own timezone) for
 * every reader who doesn't have one yet. Readers run one at a time so the
 * free Gemini quota isn't hit in a burst.
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError(401, "Unauthorized");
  }

  const started = Date.now();
  const readers = await listReaders();
  const report = { printed: 0, alreadyPrinted: 0, failed: 0, deferred: 0 };

  for (const reader of readers) {
    if (Date.now() - started > BUDGET_MS) {
      report.deferred++;
      continue;
    }
    const today = localDate(reader.timezone);
    if (await getEdition(reader.id, today)) {
      report.alreadyPrinted++;
      continue;
    }
    const result = await generateEdition(reader);
    if (result.ok) report.printed++;
    else report.failed++;
  }

  console.log("[cron] morning run", report);
  return NextResponse.json(report);
}
