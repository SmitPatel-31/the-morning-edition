import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { ensureReader } from "@/lib/db/users";
import { supabaseServer } from "@/lib/supabase/server";

/** Magic-link landing: trade the code for a session, make sure a reader row exists. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/setup");

  if (code) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureReader({ id: data.user.id, email: data.user.email }, searchParams.get("tz") ?? undefined);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
