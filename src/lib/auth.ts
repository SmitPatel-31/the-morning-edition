import { redirect } from "next/navigation";
import { ensureReader, type Reader } from "@/lib/db/users";
import { supabaseServer } from "@/lib/supabase/server";

/** The signed-in reader, or null. Verifies the session with Supabase Auth. */
export async function currentReader(): Promise<Reader | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureReader({ id: user.id, email: user.email });
}

/** For pages: the signed-in reader, or a redirect to /login. */
export async function requireReader(next?: string): Promise<Reader> {
  const reader = await currentReader();
  if (!reader) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return reader;
}

/** Same-origin relative paths only, so ?next= can't bounce users off-site. */
export function safeNext(next: string | null | undefined, fallback = "/today"): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
