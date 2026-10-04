import { NextResponse } from "next/server";
import { z } from "zod";
import { currentReader } from "@/lib/auth";
import { startConnection } from "@/lib/composio/connections";
import { SOURCES } from "@/lib/composio/toolkits";
import { jsonError, siteOrigin } from "@/lib/http";

const Body = z.object({ source: z.enum(SOURCES) });

/**
 * Starts Composio's hosted auth flow for one app, under the signed-in
 * reader's own Composio user id. The client follows `redirectUrl`; Composio
 * returns the user to /setup with `status=success|failed`.
 */
export async function POST(request: Request) {
  const reader = await currentReader();
  if (!reader) return jsonError(401, "Sign in first.");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Unknown app.");

  try {
    const callback = new URL("/setup", siteOrigin(request));
    callback.searchParams.set("connected", parsed.data.source);
    const redirectUrl = await startConnection(reader.composioUserId, parsed.data.source, callback.toString());
    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("[connect] could not start connection", error);
    return jsonError(502, "Composio couldn't start the connection. Try again in a moment.");
  }
}
