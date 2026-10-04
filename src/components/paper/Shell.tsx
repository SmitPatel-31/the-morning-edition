import Link from "next/link";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; current?: boolean };

/**
 * The page frame: a slim index strip above the paper (hidden in print) and
 * a centered sheet. `actions` sits at the right of the strip.
 */
export function Shell({ nav = [], actions, children }: { nav?: NavItem[]; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="paper-shell mx-auto max-w-[1320px] px-4 pb-16 sm:px-8">
      <nav
        aria-label="Edition"
        className="no-print flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-rule-faint py-2.5 text-[0.95rem]"
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={item.current ? "page" : undefined}
                className="index-link"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {actions && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>}
      </nav>
      {children}
    </div>
  );
}
