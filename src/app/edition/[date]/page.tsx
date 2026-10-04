import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FrontPage } from "@/components/paper/FrontPage";
import { Notice } from "@/components/paper/Notice";
import { PrintButton } from "@/components/paper/PrintButton";
import { ReaderShell } from "@/components/paper/ReaderShell";
import { requireReader } from "@/lib/auth";
import { getEdition } from "@/lib/db/editions";
import { longDate } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/edition/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(date) ? longDate(date) : "Edition" };
}

/** A past edition, re-rendered from stored data exactly as it was printed. */
export default async function EditionPage({ params }: PageProps<"/edition/[date]">) {
  const { date } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound();
  const reader = await requireReader(`/edition/${date}`);
  const stored = await getEdition(reader.id, date);
  if (!stored) notFound();

  return (
    <ReaderShell current="/archive" actions={stored.ok ? <PrintButton /> : undefined}>
      {stored.ok ? (
        <FrontPage edition={stored.edition} readerName={reader.displayName} />
      ) : (
        <Notice headline="This Edition Is Out of Print" actions={<Link href="/archive">Back to the archive</Link>}>
          {stored.reason}
        </Notice>
      )}
    </ReaderShell>
  );
}
