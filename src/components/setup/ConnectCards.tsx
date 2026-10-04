"use client";

import { useEffect, useState } from "react";
import type { ConnectionStatus, SourceConnection } from "@/lib/composio/connections";
import { SOURCE_LABELS, type Source } from "@/lib/composio/toolkits";

const BEATS: Record<Source, { bureau: string; reads: string }> = {
  gmail: {
    bureau: "Mail Room",
    reads: "Subjects, senders and short snippets from the last day of your inbox. Promotions and social mail are skipped.",
  },
  googlecalendar: {
    bureau: "Diary Desk",
    reads: "Today's events on your primary calendar: titles, times, places, and who's coming.",
  },
  github: {
    bureau: "Code Review Desk",
    reads: "Open pull requests where you are a requested reviewer.",
  },
  slack: {
    bureau: "Wire Room",
    reads: "Messages from the last day that mention you or arrive by DM, plus channels you pick in settings.",
  },
};

type Card = { source: Source; status: ConnectionStatus };

export function ConnectCards({ initial, justConnected, failed }: { initial: SourceConnection[]; justConnected?: Source; failed?: boolean }) {
  const [cards, setCards] = useState<Card[]>(() =>
    initial.map((c) => ({
      source: c.source,
      // Hold the returning card face-down for one frame so it visibly flips over.
      status: c.source === justConnected && c.status === "connected" && !failed ? "pending" : c.status,
    })),
  );
  const [busy, setBusy] = useState<Source | null>(null);
  const [error, setError] = useState<string | null>(
    failed && justConnected ? `${SOURCE_LABELS[justConnected]} didn't connect. Give it another try.` : null,
  );

  // After returning from Composio: flip the card, and poll briefly if the
  // account is still being finalized.
  useEffect(() => {
    if (!justConnected || failed) return;
    let cancelled = false;
    let tries = 0;
    const settle = (status: ConnectionStatus) =>
      setCards((prev) => prev.map((c) => (c.source === justConnected ? { ...c, status } : c)));

    const initialStatus = initial.find((c) => c.source === justConnected)?.status;
    if (initialStatus === "connected") {
      const t = setTimeout(() => settle("connected"), 350);
      return () => clearTimeout(t);
    }

    const poll = async () => {
      if (cancelled || tries++ > 10) return;
      const res = await fetch("/api/connections", { cache: "no-store" }).catch(() => null);
      const body = res?.ok ? ((await res.json()) as { connections: SourceConnection[] }) : null;
      const status = body?.connections.find((c) => c.source === justConnected)?.status;
      if (status === "connected") settle("connected");
      else setTimeout(poll, 1500);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [justConnected, failed, initial]);

  async function connect(source: Source) {
    setBusy(source);
    setError(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const body = (await res.json()) as { redirectUrl?: string; error?: string };
      if (!res.ok || !body.redirectUrl) throw new Error(body.error ?? "Couldn't start the connection.");
      window.location.assign(body.redirectUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the connection.");
      setBusy(null);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-4 border border-accent px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}
      <ul className="grid gap-5 sm:grid-cols-2">
        {cards.map(({ source, status }) => (
          <li key={source} className="flip" data-flipped={status === "connected"}>
            <div className="flip-inner">
              <section className="flip-face boxed" aria-hidden={status === "connected"}>
                <CardHead source={source} />
                <p className="mt-2 text-[0.95rem] leading-snug">{BEATS[source].reads}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm italic text-ink-soft">
                    {status === "pending" ? "Finishing the handshake…" : status === "expired" ? "Access expired" : "Not connected"}
                  </span>
                  <button
                    type="button"
                    className="press-button"
                    onClick={() => connect(source)}
                    disabled={busy !== null}
                    tabIndex={status === "connected" ? -1 : 0}
                  >
                    {busy === source ? "Opening…" : status === "expired" ? "Reconnect" : `Connect ${SOURCE_LABELS[source]}`}
                  </button>
                </div>
              </section>
              <section className="flip-face flip-back boxed" aria-hidden={status !== "connected"}>
                <CardHead source={source} />
                <p className="stamp" aria-label={`${SOURCE_LABELS[source]} connected`}>
                  Connected
                </p>
                <p className="text-sm italic text-ink-soft">Read-only. The paper never sends, posts, edits or deletes.</p>
              </section>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function CardHead({ source }: { source: Source }) {
  return (
    <header className="flex items-center gap-3 border-b border-rule-faint pb-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- remote SVG logo, decorative */}
      <img src={`https://logos.composio.dev/api/${source}`} alt="" width={28} height={28} className="logo-ink" />
      <div>
        <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold leading-tight">{SOURCE_LABELS[source]}</h2>
        <p className="dateline text-sm text-ink-soft">{BEATS[source].bureau}</p>
      </div>
    </header>
  );
}
