import type { ReactNode } from "react";

/** A centered front-page notice for empty and error states, in the paper's voice. */
export function Notice({ headline, children, actions }: { headline: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl py-16 text-center">
      <p className="nameplate text-[clamp(1.6rem,6vw,3rem)]!">The Morning Edition</p>
      <div className="mx-auto my-6 w-24 border-t-[3px] border-double border-rule" aria-hidden="true" />
      <h1 className="lead-headline">{headline}</h1>
      <div className="lead-deck mx-auto max-w-xl border-0">{children}</div>
      {actions && <div className="mt-8 flex flex-wrap items-center justify-center gap-4">{actions}</div>}
    </section>
  );
}
