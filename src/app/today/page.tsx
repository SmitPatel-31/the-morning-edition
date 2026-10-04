import type { Metadata } from "next";
import Link from "next/link";
import { FrontPage } from "@/components/paper/FrontPage";
import { Notice } from "@/components/paper/Notice";
import { PrintButton } from "@/components/paper/PrintButton";
import { ReaderShell } from "@/components/paper/ReaderShell";
import { PressRoom } from "@/components/press/PressRoom";
import { requireReader } from "@/lib/auth";
import { listConnections } from "@/lib/composio/connections";
import { getEdition, getLatestEdition } from "@/lib/db/editions";
import { shortDate } from "@/lib/format";
import { localDate } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage({ searchParams }: PageProps<"/today">) {
  const reader = await requireReader("/today");
  const fresh = Boolean((await searchParams).fresh);
  const today = localDate(reader.timezone);
  const stored = await getEdition(reader.id, today);

  if (stored?.ok) {
    return (
      <ReaderShell
        current="/today"
        actions={
          <>
            <PrintButton />
            <PressRoom label="Reprint today’s edition" compact />
          </>
        }
      >
        <FrontPage key={stored.edition.generatedAt} edition={stored.edition} readerName={reader.displayName} fresh={fresh} />
      </ReaderShell>
    );
  }

  const connections = await listConnections(reader.composioUserId).catch(() => null);
  const anyConnected = connections?.some((c) => c.status === "connected") ?? true;
  const latest = await getLatestEdition(reader.id);

  return (
    <ReaderShell current="/today">
      {anyConnected ? (
        <Notice
          headline="Today’s Edition Hasn’t Gone to Press"
          actions={
            <>
              <PressRoom />
              {latest?.ok && <Link href={`/edition/${latest.edition.date}`}>Read the {shortDate(latest.edition.date)} edition</Link>}
            </>
          }
        >
          {stored && !stored.ok
            ? "Today’s copy was set in a format the press can no longer read. Print it again for a fresh one."
            : "The reporters are standing by. Print now and the editor will read your connected apps and set the front page in under a minute."}
        </Notice>
      ) : (
        <Notice
          headline="No Correspondents Yet"
          actions={
            <Link href="/setup" className="press-button">
              Connect your apps
            </Link>
          }
        >
          The paper is written from your Gmail, Calendar, GitHub and Slack. Connect at least one and the presses can roll.
        </Notice>
      )}
    </ReaderShell>
  );
}
