import type { PressEvent } from "@/lib/edition/generate";

/**
 * A scripted run of the press for the sample page: same event stream as a
 * real edition, no accounts or API calls, so visitors can watch it work.
 */
const SCRIPT: [number, PressEvent][] = [
  [300, { type: "stage", stage: "gather", message: "Sending reporters to your apps" }],
  [700, { type: "source", source: "googlecalendar", status: "ok", count: 4 }],
  [450, { type: "source", source: "github", status: "ok", count: 3 }],
  [600, { type: "source", source: "gmail", status: "ok", count: 14 }],
  [500, { type: "source", source: "slack", status: "ok", count: 9 }],
  [400, { type: "stage", stage: "edit", message: "The editor is choosing today's stories" }],
  [2200, { type: "stage", stage: "publish", message: "Setting type and running the press" }],
  [700, { type: "done", date: "2026-10-03", editionNumber: 42, ms: 5850 }],
];

export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [delay, event] of SCRIPT) {
        await new Promise((r) => setTimeout(r, delay));
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
