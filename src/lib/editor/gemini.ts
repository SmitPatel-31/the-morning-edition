import { ApiError, GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";
import { EDITOR_SYSTEM_PROMPT } from "./prompt";
import { EditorOutputSchema, editorJsonSchema, type EditorOutput } from "./schema";

/** Gemini's free tier is out of quota. The message is shown to the reader as is. */
export class EditorBusyError extends Error {
  constructor(readonly retryAfterSeconds?: number) {
    super(
      "The editor's desk is swamped: Gemini's free tier is rate limited right now. " +
        (retryAfterSeconds ? `Try again in about ${retryAfterSeconds} seconds.` : "Try again in a minute."),
    );
    this.name = "EditorBusyError";
  }
}

export class EditorOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorOutputError";
  }
}

const MAX_RATE_LIMIT_RETRIES = 3;
const BASE_DELAY_MS = 2_000;
/** Beyond this, waiting would blow the request's time budget; report instead. */
const MAX_DELAY_MS = 20_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads Google's `retryDelay: "23s"` hint from a 429 body when present. */
export function retryDelayFromError(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/retryDelay"?\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(Number(match[1]) * 1000) : undefined;
}

function isRetryable(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 429 || error.status === 503);
}

/**
 * Calls `fn`, retrying 429 and 503 with exponential backoff and jitter
 * (2s, 4s, 8s, or Google's own hint). Gives up with `EditorBusyError` rather
 * than hanging when the suggested wait is longer than the request can afford.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delayMs: number) => void,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) throw error;
      const hinted = retryDelayFromError(error);
      const delay = hinted ?? BASE_DELAY_MS * 2 ** attempt + Math.floor(Math.random() * 500);
      if (attempt >= MAX_RATE_LIMIT_RETRIES || delay > MAX_DELAY_MS) {
        throw new EditorBusyError(Math.ceil(delay / 1000));
      }
      onRetry?.(attempt + 1, delay);
      await sleep(delay);
    }
  }
}

let client: GoogleGenAI | undefined;
const ai = () => (client ??= new GoogleGenAI({ apiKey: env.geminiApiKey() }));

function parseOutput(text: string | undefined): { ok: true; value: EditorOutput } | { ok: false; error: string } {
  if (!text) return { ok: false, error: "empty response" };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "response was not valid JSON" };
  }
  const parsed = EditorOutputSchema.safeParse(json);
  if (parsed.success) return { ok: true, value: parsed.data };
  const issues = parsed.error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  return { ok: false, error: issues };
}

/**
 * Sends the brief to Gemini and returns validated editor output. Invalid
 * output gets exactly one retry, with the validation errors fed back.
 */
export async function runEditor(
  brief: string,
  opts: { onRetry?: (reason: string) => void; signal?: AbortSignal } = {},
): Promise<{ output: EditorOutput; model: string }> {
  const model = env.geminiModel();
  const config = {
    systemInstruction: EDITOR_SYSTEM_PROMPT,
    responseMimeType: "application/json",
    responseJsonSchema: editorJsonSchema(),
    temperature: 0.6,
    // 2.5 Flash thinks by default; the brief is short and latency matters more.
    ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    ...(opts.signal ? { abortSignal: opts.signal } : {}),
  };

  const call = (contents: string) =>
    withBackoff(
      () => ai().models.generateContent({ model, contents, config }),
      (attempt, delay) => opts.onRetry?.(`Rate limited, retry ${attempt} in ${Math.round(delay / 1000)}s`),
    );

  const first = parseOutput((await call(brief)).text);
  if (first.ok) return { output: first.value, model };

  opts.onRetry?.("Editor's copy failed validation, sending it back once");
  const second = parseOutput(
    (
      await call(
        `${brief}\n\nYour previous answer did not match the schema (${first.error}). Return corrected JSON only.`,
      )
    ).text,
  );
  if (second.ok) return { output: second.value, model };
  throw new EditorOutputError(`Editor returned invalid output twice: ${second.error}`);
}
