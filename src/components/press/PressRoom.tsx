"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { SOURCE_LABELS, type Source } from "@/lib/composio/toolkits";
import type { PressEvent } from "@/lib/edition/generate";

type Line = { id: number; text: string; detail?: string; tone?: "ok" | "muted" | "warn" };

type Phase =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "error"; busy: boolean; message: string };

const DESKS: Record<Source, string> = {
  gmail: "Mail Room",
  googlecalendar: "Diary Desk",
  github: "Code Review Desk",
  slack: "Wire Room",
};

function describeSource(event: Extract<PressEvent, { type: "source" }>): Line {
  const desk = `${DESKS[event.source]} (${SOURCE_LABELS[event.source]})`;
  switch (event.status) {
    case "ok":
      return { id: 0, text: desk, detail: `${event.count} item${event.count === 1 ? "" : "s"}`, tone: "ok" };
    case "not_connected":
      return { id: 0, text: desk, detail: "not connected", tone: "muted" };
    case "skipped":
      return { id: 0, text: desk, detail: "section off", tone: "muted" };
    default:
      return { id: 0, text: desk, detail: event.note ?? "no reply", tone: "warn" };
  }
}

/**
 * "Print today's edition now": runs the press, narrating real progress
 * events from the server, then lands the fresh edition on the page.
 */
export function PressRoom({
  label = "Print today’s edition now",
  compact = false,
  endpoint = "/api/edition",
  doneHref = "/today",
}: {
  label?: string;
  compact?: boolean;
  /** Where to POST; the sample page points this at a scripted demo stream. */
  endpoint?: string;
  /** Where the fresh edition lives once printed. */
  doneHref?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [lines, setLines] = useState<Line[]>([]);
  const nextId = useRef(1);

  const push = useCallback((line: Omit<Line, "id">) => {
    setLines((prev) => [...prev, { ...line, id: nextId.current++ }]);
  }, []);

  async function run() {
    setPhase({ kind: "running" });
    setLines([]);
    push({ text: "Stop the presses. A new edition is going to bed." });

    let res: Response;
    try {
      res = await fetch(endpoint, { method: "POST" });
    } catch {
      setPhase({ kind: "error", busy: false, message: "Couldn't reach the press. Check your connection and try again." });
      return;
    }
    if (!res.ok || !res.body) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setPhase({ kind: "error", busy: res.status === 409, message: body?.error ?? "The press didn't start." });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (!part.trim()) continue;
        const event = JSON.parse(part) as PressEvent;
        if (event.type === "stage") push({ text: event.message });
        else if (event.type === "source") push(describeSource(event));
        else if (event.type === "notice") push({ text: event.message, tone: "warn" });
        else if (event.type === "error") {
          finished = true;
          setPhase({ kind: "error", busy: event.kind === "busy", message: event.message });
        } else if (event.type === "done") {
          finished = true;
          push({ text: `Edition No. ${event.editionNumber} is off the press`, detail: `${(event.ms / 1000).toFixed(1)}s`, tone: "ok" });
          // Let the last line land, then drop the paper on the desk.
          setTimeout(() => {
            setPhase({ kind: "idle" });
            router.replace(`${doneHref}?fresh=${Date.now()}`);
            router.refresh();
          }, 900);
        }
      }
    }
    if (!finished) {
      setPhase({ kind: "error", busy: false, message: "The press stopped before the edition was finished. Try again." });
    }
  }

  if (phase.kind === "idle") {
    return (
      <button type="button" className={compact ? "press-link" : "press-button"} onClick={run}>
        {label}
      </button>
    );
  }

  return (
    <div className="press-overlay" role="dialog" aria-modal="true" aria-labelledby="press-title">
      <div className="press-card">
        <h2 id="press-title" className="box-title text-[1.6rem]!">
          {phase.kind === "error" ? (phase.busy ? "The Editor Is Swamped" : "The Press Jammed") : "Going to Press"}
        </h2>
        <div className="grid items-start gap-6 pt-4 sm:grid-cols-[190px_1fr]">
          <PressArt stopped={phase.kind === "error"} />
          <ol className="wire" aria-live="polite">
            {lines.map((line) => (
              <li key={line.id} className="wire-line" data-tone={line.tone}>
                <span>{line.text}</span>
                {line.detail && (
                  <>
                    <span className="wire-leader" aria-hidden="true" />
                    <span className="num">{line.detail}</span>
                  </>
                )}
              </li>
            ))}
          </ol>
        </div>
        {phase.kind === "error" && (
          <div className="mt-5 border-t border-rule-faint pt-4">
            <p role="alert">{phase.message}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="press-button" onClick={run}>
                Try again
              </button>
              <button type="button" className="press-button secondary" onClick={() => setPhase({ kind: "idle" })}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Two inked rollers feeding a sheet that sets lines of type as it passes. */
function PressArt({ stopped }: { stopped: boolean }) {
  const paused = stopped ? { animationPlayState: "paused" as const } : undefined;
  return (
    <svg viewBox="0 0 190 170" className="w-full max-w-[190px] justify-self-center" aria-hidden="true">
      <defs>
        <clipPath id="press-feed">
          <rect x="35" y="66" width="120" height="104" />
        </clipPath>
      </defs>
      {/* Frame */}
      <rect x="14" y="8" width="162" height="6" fill="var(--ink)" />
      <rect x="20" y="14" width="6" height="56" fill="var(--ink)" />
      <rect x="164" y="14" width="6" height="56" fill="var(--ink)" />
      {/* Rollers */}
      {[{ cx: 70, reverse: false }, { cx: 120, reverse: true }].map(({ cx, reverse }) => (
        <g key={cx} className={`press-roller${reverse ? " reverse" : ""}`} style={paused}>
          <circle cx={cx} cy="42" r="24" fill="var(--paper-deep)" stroke="var(--ink)" strokeWidth="2.5" />
          <circle cx={cx} cy="42" r="5" fill="var(--ink)" />
          {[0, 60, 120].map((a) => (
            <line
              key={a}
              x1={cx + 22 * Math.cos((a * Math.PI) / 180)}
              y1={42 + 22 * Math.sin((a * Math.PI) / 180)}
              x2={cx - 22 * Math.cos((a * Math.PI) / 180)}
              y2={42 - 22 * Math.sin((a * Math.PI) / 180)}
              stroke="var(--ink)"
              strokeWidth="1.5"
            />
          ))}
        </g>
      ))}
      {/* Sheet feeding out under the rollers */}
      <g clipPath="url(#press-feed)">
        <g className="press-sheet" style={paused}>
          <rect x="45" y="66" width="100" height="104" fill="#fbf7ec" stroke="var(--rule)" strokeWidth="1" />
          <rect x="53" y="74" width="84" height="7" fill="var(--ink)" className="press-line" style={{ animationDelay: "0.2s", ...paused }} />
          {[90, 98, 106, 114, 122, 130, 138, 146, 154].map((y, i) => (
            <rect
              key={y}
              x={53}
              y={y}
              width={i % 3 === 2 ? 52 : 84}
              height="3"
              fill="var(--ink-soft)"
              className="press-line"
              style={{ animationDelay: `${0.35 + i * 0.12}s`, ...paused }}
            />
          ))}
        </g>
      </g>
      <line x1="30" y1="66" x2="160" y2="66" stroke="var(--ink)" strokeWidth="2" />
    </svg>
  );
}
