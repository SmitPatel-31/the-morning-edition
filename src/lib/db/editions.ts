import { EditionSchema, type Edition } from "@/lib/edition/types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface EditionSummary {
  editionNumber: number;
  date: string;
  headline: string | null;
  sourcesUsed: string[];
}

export type StoredEdition =
  | { ok: true; edition: Edition; generationMs: number | null }
  | { ok: false; reason: string };

interface EditionRow {
  edition_number: number;
  edition_date: string;
  content: unknown;
  sources_used: string[] | null;
  generation_ms: number | null;
}

function parseRow(row: EditionRow): StoredEdition {
  const parsed = EditionSchema.safeParse(row.content);
  return parsed.success
    ? { ok: true, edition: parsed.data, generationMs: row.generation_ms }
    : { ok: false, reason: "This edition was printed in a format the press no longer reads." };
}

export async function getEdition(userId: string, date: string): Promise<StoredEdition | null> {
  const { data, error } = await supabaseAdmin()
    .from("editions")
    .select("edition_number, edition_date, content, sources_used, generation_ms")
    .eq("user_id", userId)
    .eq("edition_date", date)
    .maybeSingle<EditionRow>();
  if (error) throw error;
  return data ? parseRow(data) : null;
}

export async function getLatestEdition(userId: string): Promise<StoredEdition | null> {
  const { data, error } = await supabaseAdmin()
    .from("editions")
    .select("edition_number, edition_date, content, sources_used, generation_ms")
    .eq("user_id", userId)
    .order("edition_date", { ascending: false })
    .limit(1)
    .maybeSingle<EditionRow>();
  if (error) throw error;
  return data ? parseRow(data) : null;
}

export async function listEditions(userId: string): Promise<EditionSummary[]> {
  const { data, error } = await supabaseAdmin()
    .from("editions")
    .select("edition_number, edition_date, content->lead->>headline, sources_used")
    .eq("user_id", userId)
    .order("edition_date", { ascending: false })
    .limit(366)
    .returns<{ edition_number: number; edition_date: string; headline: string | null; sources_used: string[] | null }[]>();
  if (error) throw error;
  return (data ?? []).map((r) => ({
    editionNumber: r.edition_number,
    date: r.edition_date,
    headline: r.headline,
    sourcesUsed: r.sources_used ?? [],
  }));
}

/**
 * The number to print on an edition for `date`: reprinting a day keeps its
 * number, a new day gets one more than the highest so far.
 */
export async function editionNumberFor(userId: string, date: string): Promise<number> {
  const db = supabaseAdmin();
  const same = await db
    .from("editions")
    .select("edition_number")
    .eq("user_id", userId)
    .eq("edition_date", date)
    .maybeSingle<{ edition_number: number }>();
  if (same.error) throw same.error;
  if (same.data) return same.data.edition_number;

  const max = await db
    .from("editions")
    .select("edition_number")
    .eq("user_id", userId)
    .order("edition_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ edition_number: number }>();
  if (max.error) throw max.error;
  return (max.data?.edition_number ?? 0) + 1;
}

export async function saveEdition(
  userId: string,
  edition: Edition,
  meta: { sourcesUsed: string[]; generationMs: number },
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("editions")
    .upsert(
      {
        user_id: userId,
        edition_number: edition.editionNumber,
        edition_date: edition.date,
        content: edition,
        sources_used: meta.sourcesUsed,
        generation_ms: meta.generationMs,
        created_at: new Date().toISOString(),
      },
      { onConflict: "user_id,edition_date" },
    );
  if (error) throw error;
}
