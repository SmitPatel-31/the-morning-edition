"use client";

import { useMemo, useState, useTransition } from "react";
import { SOURCE_LABELS, SOURCES, type Source } from "@/lib/composio/toolkits";
import type { Settings } from "@/lib/db/users";
import { saveSettings } from "./actions";

type Channel = { id: string; name: string };

export function SettingsForm({
  timezone,
  settings,
  channels,
  slackStatus,
}: {
  timezone: string;
  settings: Settings;
  channels: Channel[] | null;
  slackStatus: "connected" | "not_connected" | "unavailable";
}) {
  const zones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const [tz, setTz] = useState(timezone);
  const [sections, setSections] = useState<Record<Source, boolean>>(settings.sections);
  const [picked, setPicked] = useState<Channel[]>(settings.slackChannels);
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const pickedIds = new Set(picked.map((c) => c.id));
  const visible = (channels ?? []).filter((c) => c.name.includes(filter.toLowerCase().replace(/^#/, ""))).slice(0, 60);

  function toggleChannel(channel: Channel) {
    setResult(null);
    setPicked((prev) =>
      prev.some((c) => c.id === channel.id) ? prev.filter((c) => c.id !== channel.id) : [...prev, channel].slice(0, 10),
    );
  }

  function submit() {
    startTransition(async () => {
      const res = await saveSettings({ timezone: tz, sections, slackChannels: picked });
      setResult(res.ok ? { ok: true, message: "Saved. Tomorrow's edition will follow these settings." } : { ok: false, message: res.error });
    });
  }

  return (
    <form
      action={submit}
      className="space-y-10"
      onChange={() => setResult(null)}
    >
      <fieldset>
        <legend className="inside-title w-full">Delivery</legend>
        <label htmlFor="tz" className="dateline mt-4 block">
          Timezone
        </label>
        <p className="mb-2 text-sm text-ink-soft">Sets which day counts as &ldquo;today&rdquo; and when the morning paper prints.</p>
        <select id="tz" value={tz} onChange={(e) => setTz(e.target.value)} className="field max-w-sm">
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="inside-title w-full">Sections</legend>
        <p className="mt-4 mb-2 text-sm text-ink-soft">Turn off a section and the paper stops reading that app.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s}>
              <label className="flex cursor-pointer items-center gap-3 border border-rule-faint px-3 py-2.5 has-[:checked]:border-rule">
                <input
                  type="checkbox"
                  checked={sections[s]}
                  onChange={(e) => setSections((prev) => ({ ...prev, [s]: e.target.checked }))}
                  className="size-4 accent-[var(--ink)]"
                />
                <span className="font-semibold">{SOURCE_LABELS[s]}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="inside-title w-full">Slack channels</legend>
        <p className="mt-4 mb-3 text-sm text-ink-soft">
          Mentions and direct messages are always read. Pick up to ten channels to read in full as well.
        </p>
        {slackStatus === "not_connected" ? (
          <p className="italic text-ink-soft">Connect Slack on the Connections page to choose channels.</p>
        ) : slackStatus === "unavailable" || !channels ? (
          <p className="italic text-ink-soft">Slack&rsquo;s channel list couldn&rsquo;t be fetched right now. Your saved picks are kept.</p>
        ) : (
          <>
            {picked.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-2" aria-label="Selected channels">
                {picked.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => toggleChannel(c)} className="inline-flex items-center border border-rule px-2 py-0.5 text-sm hover:bg-[rgb(28_25_21/0.06)]">
                      #{c.name}
                      <svg viewBox="0 0 10 10" className="ml-1.5 inline size-2.5 align-[0.05em]" aria-hidden="true">
                        <path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span className="sr-only"> (remove)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter channels"
              aria-label="Filter channels"
              className="field mb-2 max-w-sm"
            />
            <ul className="max-h-64 overflow-y-auto border border-rule-faint">
              {visible.map((c) => (
                <li key={c.id} className="border-b border-dotted border-rule-faint last:border-0">
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={pickedIds.has(c.id)}
                      onChange={() => toggleChannel(c)}
                      disabled={!pickedIds.has(c.id) && picked.length >= 10}
                      className="size-4 accent-[var(--ink)]"
                    />
                    #{c.name}
                  </label>
                </li>
              ))}
              {visible.length === 0 && <li className="px-3 py-2 italic text-ink-soft">No channels match.</li>}
            </ul>
          </>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t-[3px] border-double border-rule pt-5">
        <button type="submit" className="press-button" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {result && (
          <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-ink-soft" : "text-accent"}>
            {result.message}
          </p>
        )}
      </div>
    </form>
  );
}
