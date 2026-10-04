import type { Edition, PullRequestEntry, ScheduleEntry, SourceRef, Story } from "@/lib/edition/types";
import { SOURCE_LABELS, SOURCES } from "@/lib/composio/toolkits";
import { clockTime, longDate, roman, waitedFor } from "@/lib/format";

/**
 * The broadsheet. Pure layout from an `Edition`: no data fetching, so any
 * stored edition renders the same today as the day it was printed.
 */
export function FrontPage({ edition, readerName, fresh = false }: { edition: Edition; readerName?: string | null; fresh?: boolean }) {
  const [featured, ...rest] = edition.stories;
  return (
    <article className={fresh ? "fresh" : undefined} aria-label={`The Morning Edition for ${longDate(edition.date)}`}>
      <Masthead edition={edition} readerName={readerName} />

      <div className="front">
        <section className="lead" aria-label="Lead story">
          {edition.lead ? <LeadStory story={edition.lead} refs={edition.references} /> : <QuietMorning />}
        </section>
        <aside className="lead-side" aria-label="Today's schedule">
          <MobileWeather edition={edition} />
          <ScheduleBox entries={edition.schedule} timezone={edition.timezone} status={edition.sources.googlecalendar} />
          <InsideIndex stories={edition.stories} />
        </aside>
      </div>

      <div className="below">
        {featured && <StoryBlock id="story-1" story={featured} refs={edition.references} featured />}
        {rest.map((story, i) => (
          <StoryBlock key={story.headline} id={`story-${i + 2}`} story={story} refs={edition.references} />
        ))}
        <aside className="sidebar" aria-label="Pull requests awaiting review">
          <ReviewBox entries={edition.pullRequests} generatedAt={edition.generatedAt} status={edition.sources.github} />
        </aside>
      </div>

      <Dispatches edition={edition} />
    </article>
  );
}

function Masthead({ edition, readerName }: { edition: Edition; readerName?: string | null }) {
  const volume = roman(Math.max(1, Number(edition.date.slice(0, 4)) - 2025));
  return (
    <header>
      <div className="masthead">
        <div className="ear">
          <div className="ear-title">Today&rsquo;s Forecast</div>
          <p className="italic">{edition.weather.forecast}</p>
          <Busyness value={edition.weather.busyness} />
        </div>
        <h1 className="nameplate">The Morning Edition</h1>
        <div className="ear ear-right">
          <div className="ear-title">Late City Edition</div>
          <p className="italic">All the news that&rsquo;s fit to read before coffee.</p>
        </div>
      </div>
      <div className="folio">
        <span>
          Vol. {volume} &middot; No. <span className="num">{edition.editionNumber}</span>
        </span>
        <span>{longDate(edition.date)}</span>
        <span>
          Printed {clockTime(edition.generatedAt, edition.timezone)}
          {readerName ? <> for {readerName}</> : null}
        </span>
      </div>
    </header>
  );
}

function Busyness({ value }: { value: number }) {
  return (
    <p className="mt-1.5" aria-label={`Busyness ${value} of 5`}>
      <span className="ear-title border-0 p-0 m-0 inline">Busyness</span>
      <span className="busy-bars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} data-on={n <= value} />
        ))}
      </span>
    </p>
  );
}

function MobileWeather({ edition }: { edition: Edition }) {
  return (
    <div className="mobile-weather mb-4 border-b border-rule-faint pb-3 text-sm">
      <span className="dateline">Forecast &mdash; </span>
      <span className="italic">{edition.weather.forecast}</span>
      <Busyness value={edition.weather.busyness} />
    </div>
  );
}

function Paragraphs({ story, dateline = true }: { story: Story; dateline?: boolean }) {
  const paragraphs = story.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i}>
          {i === 0 && dateline && <span className="dateline">{story.section} &mdash; </span>}
          {p}
        </p>
      ))}
    </>
  );
}

function LeadStory({ story, refs }: { story: Story; refs: Record<string, SourceRef> }) {
  return (
    <>
      <h2 className="lead-headline">{story.headline}</h2>
      {story.deck && <p className="lead-deck">{story.deck}</p>}
      <div className="lead-body copy drop-cap">
        {/* The lead opens on its drop cap, so it carries no dateline. */}
        <Paragraphs story={story} dateline={false} />
      </div>
      <SourceLine story={story} refs={refs} />
    </>
  );
}

function QuietMorning() {
  return (
    <>
      <h2 className="lead-headline">A Quiet Morning on Every Wire</h2>
      <p className="lead-deck">No mail, meetings, reviews or mentions reached the desk for this edition.</p>
      <div className="lead-body copy drop-cap">
        <p>
          The reporters came back with empty notebooks. Either the day is genuinely clear, or the apps that would have
          filled this page aren&rsquo;t connected yet. The dispatch line at the foot of the page says which.
        </p>
      </div>
    </>
  );
}

function StoryBlock({
  id,
  story,
  refs,
  featured = false,
}: {
  id: string;
  story: Story;
  refs: Record<string, SourceRef>;
  featured?: boolean;
}) {
  return (
    <section id={id} className={`story${featured ? " featured" : ""}`}>
      <h3 className="story-headline">{story.headline}</h3>
      <div className="story-rule" aria-hidden="true" />
      <div className="story-copy copy">
        <Paragraphs story={story} />
      </div>
      <SourceLine story={story} refs={refs} />
    </section>
  );
}

/** The "Inside" box: an index of the day's other stories, by section. */
function InsideIndex({ stories }: { stories: Story[] }) {
  if (stories.length === 0) return null;
  return (
    <nav aria-label="Inside today's edition" className="inside">
      <h2 className="inside-title">Inside</h2>
      <ol>
        {stories.map((story, i) => (
          <li key={story.headline}>
            <a href={`#story-${i + 1}`}>
              <span className="dateline">{story.section}</span>
              <span className="inside-leader" aria-hidden="true" />
              <span className="inside-headline">{story.headline}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SourceLine({ story, refs }: { story: Story; refs: Record<string, SourceRef> }) {
  const sources = story.sourceIds.map((id) => ({ id, ref: refs[id] })).filter((s) => s.ref);
  return (
    <footer>
      {sources.length > 0 && (
        <p className="sources">
          From{" "}
          {sources.map(({ id, ref }, i) => (
            <span key={id}>
              {i > 0 && (i === sources.length - 1 ? " and " : ", ")}
              {ref.url ? (
                <a href={ref.url} target="_blank" rel="noreferrer">
                  {ref.label}
                </a>
              ) : (
                ref.label
              )}
            </span>
          ))}
          .
        </p>
      )}
      <p className="why">
        On the page because: {story.importanceReason.replace(/\.$/, "")}{" "}
        <span className="num">({story.importance}/10)</span>
      </p>
    </footer>
  );
}

function SectionGap({ status, what }: { status: Edition["sources"][keyof Edition["sources"]]; what: string }) {
  const message =
    status.status === "not_connected"
      ? `Connect ${what} in setup to fill this box.`
      : status.status === "skipped"
        ? "This section is turned off in settings."
        : status.status === "error"
          ? `${status.note ?? "The wire went quiet"}.`
          : null;
  return message ? <p className="box-row italic text-ink-soft">{message}</p> : null;
}

function ScheduleBox({
  entries,
  timezone,
  status,
}: {
  entries: ScheduleEntry[];
  timezone: string;
  status: Edition["sources"]["googlecalendar"];
}) {
  return (
    <div className="boxed">
      <h2 className="box-title">Today&rsquo;s Schedule</h2>
      {status.status !== "ok" ? (
        <SectionGap status={status} what="Google Calendar" />
      ) : entries.length === 0 ? (
        <p className="box-row italic text-ink-soft">Not a meeting in sight. The day is yours.</p>
      ) : (
        <ol>
          {entries.map((e) => {
            const key = (e.importance ?? 0) >= 7;
            return (
              <li key={e.sourceId} className="box-row grid grid-cols-[4.6rem_1fr] gap-x-3">
                <span className="num text-sm pt-px">{e.allDay ? "All day" : clockTime(e.start, timezone)}</span>
                <span>
                  <span className={key ? "font-semibold" : undefined}>
                    {key && <span className="key-mark" aria-label="Key meeting" />}
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                        {e.title}
                      </a>
                    ) : (
                      e.title
                    )}
                  </span>
                  {e.location && <span className="block text-sm text-ink-soft">{e.location}</span>}
                  {e.note && <span className="block text-sm italic text-ink-soft">{e.note}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function ReviewBox({
  entries,
  generatedAt,
  status,
}: {
  entries: PullRequestEntry[];
  generatedAt: string;
  status: Edition["sources"]["github"];
}) {
  const printedAt = new Date(generatedAt);
  return (
    <div className="boxed">
      <h2 className="box-title">Pull Requests Awaiting Review</h2>
      {status.status !== "ok" ? (
        <SectionGap status={status} what="GitHub" />
      ) : entries.length === 0 ? (
        <p className="box-row italic text-ink-soft">Nobody is waiting on you. A rare and beautiful thing.</p>
      ) : (
        <ol>
          {entries.map((pr) => (
            <li key={pr.sourceId} className="box-row">
              <p className="num text-xs tracking-wide text-ink-soft">
                {pr.repo} #{pr.number}
                {pr.draft && " · draft"}
              </p>
              <p className="font-semibold leading-snug">
                {(pr.importance ?? 0) >= 7 && <span className="key-mark" aria-label="Priority" />}
                <a href={pr.url} target="_blank" rel="noreferrer" className="no-underline hover:underline">
                  {pr.title}
                </a>
              </p>
              <p className="text-sm text-ink-soft">
                by {pr.author}, {waitedFor(pr.createdAt, printedAt)}
              </p>
              {pr.note && <p className="text-sm italic text-ink-soft">{pr.note}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Dispatches({ edition }: { edition: Edition }) {
  return (
    <footer className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm text-ink">
      <p>
        <span className="dateline text-ink">Dispatches &mdash; </span>
        {SOURCES.map((s, i) => {
          const st = edition.sources[s];
          const label =
            st.status === "ok"
              ? `${st.count} item${st.count === 1 ? "" : "s"}`
              : st.status === "not_connected"
                ? "not connected"
                : st.status === "skipped"
                  ? "off"
                  : "no reply";
          return (
            <span key={s}>
              {i > 0 && " · "}
              {SOURCE_LABELS[s]} <span className="num">{label}</span>
            </span>
          );
        })}
      </p>
      <p className="italic">Read-only. Nothing was sent, posted, or changed in your apps.</p>
    </footer>
  );
}
