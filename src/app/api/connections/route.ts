import { NextResponse } from "next/server";
import { currentReader } from "@/lib/auth";
import { listConnections } from "@/lib/composio/connections";
import { jsonError } from "@/lib/http";

export async function GET() {
  const reader = await currentReader();
  if (!reader) return jsonError(401, "Sign in first.");
  try {
    return NextResponse.json({ connections: await listConnections(reader.composioUserId) });
  } catch (error) {
    console.error("[connections] list failed", error);
    return jsonError(502, "Couldn't reach Composio.");
  }
}
