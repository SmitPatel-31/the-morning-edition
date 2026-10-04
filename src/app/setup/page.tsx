import type { Metadata } from "next";
import Link from "next/link";
import { ReaderShell } from "@/components/paper/ReaderShell";
import { ConnectCards } from "@/components/setup/ConnectCards";
import { requireReader } from "@/lib/auth";
import { listConnections, type SourceConnection } from "@/lib/composio/connections";
import { SOURCES, type Source } from "@/lib/composio/toolkits";

export const metadata: Metadata = { title: "Set up your newspaper" };

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const reader = await requireReader("/setup");
  const params = await searchParams;
  const connected = typeof params.connected === "string" && (SOURCES as readonly string[]).includes(params.connected)
    ? (params.connected as Source)
    : undefined;
  const failed = params.status === "failed";

  let connections: SourceConnection[] | null = null;
  try {
    connections = await listConnections(reader.composioUserId);
  } catch (error) {
    console.error("[setup] could not list connections", error);
  }
  const count = connections?.filter((c) => c.status === "connected").length ?? 0;

  return (
    <ReaderShell current="/setup">
      <header className="mx-auto max-w-3xl pt-10 text-center">
        <p className="nameplate text-[clamp(1.6rem,5vw,2.6rem)]!">The Morning Edition</p>
        <h1 className="lead-headline mt-6">Set Up Your Newspaper</h1>
        <p className="lead-deck mx-auto max-w-2xl border-0">
          Every paper needs correspondents. Connect the apps you want reported on; each one signs in through Composio
          under your account alone, and the paper only ever reads.
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-3xl">
        {connections ? (
          <ConnectCards initial={connections} justConnected={connected} failed={failed} />
        ) : (
          <p role="alert" className="border border-accent px-3 py-2 text-accent">
            The connections desk can&rsquo;t reach Composio right now. Refresh in a moment.
          </p>
        )}

        <div className="mt-10 flex flex-col items-center gap-3 border-t-[3px] border-double border-rule pt-6 text-center">
          <p className="text-ink-soft">
            {count === 0
              ? "Connect at least one app to print your first edition."
              : `${count} of ${SOURCES.length} correspondents on the wire. Any app you skip becomes a note in the paper, not a gap.`}
          </p>
          {count > 0 && (
            <Link href="/today" className="press-button">
              Go to today&rsquo;s edition
            </Link>
          )}
        </div>
      </div>
    </ReaderShell>
  );
}
