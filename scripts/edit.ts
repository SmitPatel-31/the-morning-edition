/**
 * Gather, run the Gemini editor, and print the assembled
 * edition as JSON, without touching the database.
 *
 *   npm run edit -- <composio-user-id> [timezone]
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const [userId, timezone = "America/New_York"] = process.argv.slice(2);
  if (!userId) {
    console.error("Usage: npm run edit -- <composio-user-id> [timezone]");
    process.exit(1);
  }
  const { gatherAll } = await import("../src/lib/gather");
  const { buildEditorPrompt } = await import("../src/lib/editor/prompt");
  const { runEditor } = await import("../src/lib/editor/gemini");
  const { assembleEdition } = await import("../src/lib/edition/assemble");
  const { localDate } = await import("../src/lib/time");

  const now = new Date();
  const date = localDate(timezone, now);
  const results = await gatherAll(userId, { timezone, slackChannels: [], disabledSources: [], now });
  const brief = buildEditorPrompt(results, { timezone, date, now });
  console.error(`Brief: ${brief.length} chars\n`);

  const started = Date.now();
  const { output, model } = await runEditor(brief, { onRetry: (m) => console.error(`  ↻ ${m}`) });
  console.error(`Editor (${model}) took ${Date.now() - started}ms\n`);

  const edition = assembleEdition(output, results, { editionNumber: 1, date, timezone, model, now });
  console.log(JSON.stringify(edition, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
