import type { ReactNode } from "react";
import { Shell } from "./Shell";

const ITEMS = [
  { href: "/today", label: "Today" },
  { href: "/archive", label: "Archive" },
  { href: "/setup", label: "Connections" },
  { href: "/settings", label: "Settings" },
] as const;

/** Shell for signed-in pages: the reader's index strip plus sign-out. */
export function ReaderShell({
  current,
  actions,
  children,
}: {
  current?: (typeof ITEMS)[number]["href"];
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Shell
      nav={ITEMS.map((i) => ({ ...i, current: i.href === current }))}
      actions={
        <>
          {actions}
          <form action="/auth/signout" method="post">
            <button type="submit" className="index-link cursor-pointer">
              Sign out
            </button>
          </form>
        </>
      }
    >
      {children}
    </Shell>
  );
}
