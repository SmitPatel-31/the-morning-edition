import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/paper/Notice";
import { ReaderShell } from "@/components/paper/ReaderShell";
import { requireReader } from "@/lib/auth";
import { SOURCE_LABELS, type Source } from "@/lib/composio/toolkits";
import { listEditions, type EditionSummary } from "@/lib/db/editions";

export const metadata: Metadata = { title: "Archive" };

function monthOf(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function dayOf(date: string): { weekday: string; day: string } {
  const d = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(d),
    day: new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(d),
  };
}

export default async function ArchivePage() {
  const reader = await requireReader("/archive");
  const editions = await listEditions(reader.id);

  const months = new Map<string, EditionSummary[]>();
  for (const e of editions) {
    const key = monthOf(e.date);
    months.set(key, [...(months.get(key) ?? []), e]);
  }

  return (
    <ReaderShell current="/archive">
      {editions.length === 0 ? (
        <Notice headline="The Morgue Is Empty" actions={<Link href="/today" className="press-button">Print your first edition</Link>}>
          Newspapers keep every back issue in a room called the morgue. Yours will fill up one morning at a time.
        </Notice>
      ) : (
        <div className="mx-auto max-w-4xl">
          <header className="pt-10 pb-6 text-center">
            <p className="nameplate text-[clamp(1.6rem,5vw,2.6rem)]">The Morning Edition</p>
            <h1 className="lead-headline mt-5">From the Morgue</h1>
            <p className="lead-deck border-0">
              Every edition, exactly as it ran. {editions.length} on file.
            </p>
          </header>
          {[...months.entries()].map(([month, list]) => (
            <section key={month} className="mb-10">
              <h2 className="inside-title">{month}</h2>
              <ol>
                {list.map((e) => {
                  const { weekday, day } = dayOf(e.date);
                  return (
                    <li key={e.date} className="border-b border-dotted border-rule-faint">
                      <Link
                        href={`/edition/${e.date}`}
                        className="group grid grid-cols-[3.5rem_1fr] items-baseline gap-x-4 py-3 no-underline sm:grid-cols-[3.5rem_1fr_auto]"
                      >
                        <span className="text-center leading-none">
                          <span className="dateline block text-sm text-ink-soft">{weekday}</span>
                          <span className="num block font-[family-name:var(--font-playfair)] text-3xl font-bold">{day}</span>
                        </span>
                        <span>
                          <span className="block font-[family-name:var(--font-playfair)] text-xl font-bold leading-tight group-hover:underline">
                            {e.headline ?? "A quiet morning"}
                          </span>
                          <span className="mt-1 block text-sm text-ink-soft">
                            {e.sourcesUsed.length
                              ? `From ${e.sourcesUsed.map((s) => SOURCE_LABELS[s as Source] ?? s).join(", ")}`
                              : "No sources reported"}
                          </span>
                        </span>
                        <span className="num col-start-2 text-sm italic text-ink-soft sm:col-start-auto">No. {e.editionNumber}</span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </ReaderShell>
  );
}
