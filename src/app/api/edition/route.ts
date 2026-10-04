import { currentReader } from "@/lib/auth";
import { generateEdition, type PressEvent } from "@/lib/edition/generate";
import { jsonError } from "@/lib/http";

// Gathering plus a rate-limited Gemini call can take a while on the free tier.
export const maxDuration = 60;

// One run per reader at a time on this instance; a second click just waits its turn.
const running = new Set<string>();

/**
 * Prints today's edition for the signed-in reader, streaming progress as
 * newline-delimited JSON (`PressEvent` per line) for the press animation.
 */
export async function POST() {
  const reader = await currentReader();
  if (!reader) return jsonError(401, "Sign in first.");
  if (running.has(reader.id)) return jsonError(409, "The press is already running for you.");

  running.add(reader.id);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PressEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await generateEdition(reader, send);
      } finally {
        running.delete(reader.id);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
