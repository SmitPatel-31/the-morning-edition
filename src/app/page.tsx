import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Shell } from "@/components/paper/Shell";
import { currentReader } from "@/lib/auth";
import { longDate } from "@/lib/format";
import { localDate } from "@/lib/time";

async function signedIn(): Promise<boolean> {
  // The landing page renders even before Supabase is configured.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return false;
  return (await currentReader().catch(() => null)) !== null;
}

export default async function Home() {
  // Rendered per request: the folio carries today's date and signed-in readers are redirected.
  await connection();
  if (await signedIn()) redirect("/today");
  const today = localDate("America/New_York");

  return (
    <Shell
      nav={[{ href: "/", label: "Front desk", current: true }, { href: "/sample", label: "Sample edition" }]}
      actions={
        <Link href="/login" className="press-button">
          Start your subscription
        </Link>
      }
    >
      <header>
        <h1 className="nameplate pt-6 pb-3">The Morning Edition</h1>
        <div className="folio">
          <span>Special Inaugural Issue</span>
          <span>{longDate(today)}</span>
          <span>Free to every reader</span>
        </div>
      </header>

      <div className="front">
        <section className="lead">
          <h2 className="lead-headline">Your Inbox, Calendar, Code Reviews and Slack, Edited Into One Front Page</h2>
          <p className="lead-deck">
            Every morning an AI editor reads the apps you connect, decides what actually matters, and sets it in type
            before you open a single tab.
          </p>
          <div className="lead-body copy drop-cap">
            <p>
              Mornings begin with four apps and forty notifications, each insisting it comes first. The Morning
              Edition reads them for you and does what a good editor does: picks the story that matters most, puts it
              at the top, and keeps the rest in proportion.
            </p>
            <p>
              Your meetings go in the schedule box. Pull requests waiting on you go in their own column, oldest first.
              The day&rsquo;s workload gets a weather report. Every story links back to the email, event, pull request
              or message it came from, so nothing is taken on faith.
            </p>
            <p>
              The editor is held to a newspaper&rsquo;s rule: report what the sources say and nothing more. Stories
              that can&rsquo;t point to a real item never reach the page.
            </p>
          </div>
          <div className="no-print mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/login" className="press-button">
              Start your subscription
            </Link>
            <Link href="/sample">Read a sample edition first</Link>
          </div>
        </section>

        <aside className="lead-side">
          <div className="boxed">
            <h2 className="box-title">The Read-Only Pledge</h2>
            <p className="box-row">
              The paper reads. It never sends, posts, replies, archives, edits or deletes anything in your apps.
            </p>
            <p className="box-row text-sm text-ink-soft">
              Enforced three ways: a fixed list of read-only tools in code, a check that Composio marks each tool
              read-only before it runs, and read-only Google scopes where Google offers them.
            </p>
          </div>
        </aside>
      </div>

      <div className="below">
        <HowItWorks
          headline="Reporters Fan Out at Dawn"
          dateline="Gather"
          body="Through Composio, the paper signs in to each app under your own account and collects the last day of mail, today's meetings, reviews waiting on you and Slack mentions, all at once. If one app is down or not connected, the edition prints without it and says so."
        />
        <HowItWorks
          headline="An Editor Who Won't Make Things Up"
          dateline="Edit"
          body="Gemini reads a compact digest of subjects, senders, titles and snippets, never full message bodies, and writes headlines in newspaper voice with an importance score and a reason for each. Its copy is checked against a strict schema, and every story must cite real items."
        />
        <HowItWorks
          headline="Off the Press, Into the Archive"
          dateline="Publish"
          body="Each edition is stored and can be reprinted any time, exactly as it ran. A fresh paper prints automatically every morning in your timezone, or on demand with one button. It prints cleanly on real paper too."
        />
        <aside className="sidebar">
          <div className="boxed">
            <h2 className="box-title">Correspondents</h2>
            {["Gmail", "Google Calendar", "GitHub", "Slack"].map((app) => (
              <p key={app} className="box-row flex items-baseline justify-between gap-3">
                <span className="font-semibold">{app}</span>
                <span className="text-sm italic text-ink-soft">connect any or all</span>
              </p>
            ))}
          </div>
        </aside>
      </div>

      <footer className="py-3 text-sm italic text-ink-soft">
        Built on Composio, Gemini, Supabase and Vercel, on free tiers throughout.
      </footer>
    </Shell>
  );
}

function HowItWorks({ headline, dateline, body }: { headline: string; dateline: string; body: string }) {
  return (
    <section className="story">
      <h3 className="story-headline">{headline}</h3>
      <div className="story-rule" aria-hidden="true" />
      <div className="copy">
        <p>
          <span className="dateline">{dateline} &mdash; </span>
          {body}
        </p>
      </div>
    </section>
  );
}
