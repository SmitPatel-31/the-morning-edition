"use client";

import { Notice } from "@/components/paper/Notice";
import { Shell } from "@/components/paper/Shell";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <Shell nav={[{ href: "/", label: "Front desk" }]}>
      <Notice
        headline="A Correction Is Being Set"
        actions={
          <button type="button" className="press-button" onClick={() => retry()}>
            Try again
          </button>
        }
      >
        Something went wrong putting this page together. Nothing in your apps was touched. Try again in a moment.
      </Notice>
    </Shell>
  );
}
