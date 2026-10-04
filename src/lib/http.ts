import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Base URL for links Composio sends users back to. */
export function siteOrigin(request: Request): string {
  return env.siteUrl() ?? new URL(request.url).origin;
}
