import type { Metadata } from "next";
import Link from "next/link";
import { FrontPage } from "@/components/paper/FrontPage";
import { PrintButton } from "@/components/paper/PrintButton";
import { Shell } from "@/components/paper/Shell";
import { SAMPLE_EDITION } from "@/lib/edition/sample";

export const metadata: Metadata = { title: "Sample edition" };

export default function SamplePage() {
  return (
    <Shell
      nav={[{ href: "/", label: "Front desk" }, { href: "/sample", label: "Sample edition", current: true }]}
      actions={
        <>
          <PrintButton />
          <Link href="/login" className="press-button">
            Print your own
          </Link>
        </>
      }
    >
      <p className="no-print mt-3 border border-rule-faint px-3 py-2 text-sm italic text-ink-soft">
        A sample edition with invented people, companies and repositories, so you can see the paper before connecting
        anything.
      </p>
      <FrontPage edition={SAMPLE_EDITION} readerName="a sample reader" />
    </Shell>
  );
}
