/**
 * Gather and print normalized items for one Composio user.
 *
 *   npm run gather -- <composio-user-id> [timezone]
 *
 * Reads COMPOSIO_API_KEY from .env.local. Only read tools are called.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const [userId, timezone = "America/New_York"] = process.argv.slice(2);
  if (!userId) {
    console.error("Usage: npm run gather -- <composio-user-id> [timezone]");
    process.exit(1);
  }

  const { gatherAll } = await import("../src/lib/gather");
  const started = Date.now();
  const results = await gatherAll(
    userId,
    { timezone, slackChannels: [], disabledSources: [] },
    ({ source, result }) =>
      console.log(`  ✓ ${source.padEnd(15)} ${result.status.padEnd(14)} ${result.items.length} items  ${result.ms}ms`),
  );

  for (const result of Object.values(results)) {
    console.log(`\n── ${result.source} (${result.status}${result.note ? `: ${result.note}` : ""})`);
    for (const item of result.items.slice(0, 5)) console.log(JSON.stringify(item));
  }
  console.log(`\nGathered in ${Date.now() - started}ms`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
