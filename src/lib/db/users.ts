import { z } from "zod";
import { SOURCES, type Source } from "@/lib/composio/toolkits";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isValidTimeZone } from "@/lib/time";

export const SettingsSchema = z.object({
  slackChannels: z.array(z.object({ id: z.string(), name: z.string() })).max(10).default([]),
  sections: z
    .object(Object.fromEntries(SOURCES.map((s) => [s, z.boolean().default(true)])) as Record<Source, z.ZodDefault<z.ZodBoolean>>)
    .default({ gmail: true, googlecalendar: true, github: true, slack: true }),
});
export type Settings = z.infer<typeof SettingsSchema>;

export interface Reader {
  id: string;
  authUserId: string;
  composioUserId: string;
  displayName: string | null;
  timezone: string;
  settings: Settings;
}

interface UserRow {
  id: string;
  auth_user_id: string;
  composio_user_id: string;
  display_name: string | null;
  timezone: string | null;
  settings: unknown;
}

const COLUMNS = "id, auth_user_id, composio_user_id, display_name, timezone, settings";

function toReader(row: UserRow): Reader {
  const parsed = SettingsSchema.safeParse(row.settings ?? {});
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    composioUserId: row.composio_user_id,
    displayName: row.display_name,
    timezone: row.timezone && isValidTimeZone(row.timezone) ? row.timezone : "America/New_York",
    settings: parsed.success ? parsed.data : SettingsSchema.parse({}),
  };
}

/**
 * Finds or creates the reader row for a Supabase Auth user. The Composio
 * user id is derived from the auth id, so it is stable, unique, and never
 * chosen by the client.
 */
export async function ensureReader(auth: { id: string; email?: string | null }, timezone?: string): Promise<Reader> {
  const db = supabaseAdmin();
  const existing = await db.from("users").select(COLUMNS).eq("auth_user_id", auth.id).maybeSingle<UserRow>();
  if (existing.error) throw existing.error;
  if (existing.data) return toReader(existing.data);

  const created = await db
    .from("users")
    .upsert(
      {
        auth_user_id: auth.id,
        composio_user_id: `reader_${auth.id}`,
        display_name: auth.email?.split("@")[0] ?? null,
        timezone: timezone && isValidTimeZone(timezone) ? timezone : "America/New_York",
        settings: SettingsSchema.parse({}),
      },
      { onConflict: "auth_user_id" },
    )
    .select(COLUMNS)
    .single<UserRow>();
  if (created.error) throw created.error;
  return toReader(created.data);
}

export async function updateReader(
  id: string,
  patch: { timezone?: string; displayName?: string; settings?: Settings },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (patch.timezone !== undefined) update.timezone = patch.timezone;
  if (patch.displayName !== undefined) update.display_name = patch.displayName;
  if (patch.settings !== undefined) update.settings = patch.settings;
  const { error } = await supabaseAdmin().from("users").update(update).eq("id", id);
  if (error) throw error;
}

export async function listReaders(): Promise<Reader[]> {
  const { data, error } = await supabaseAdmin().from("users").select(COLUMNS).returns<UserRow[]>();
  if (error) throw error;
  return (data ?? []).map(toReader);
}
