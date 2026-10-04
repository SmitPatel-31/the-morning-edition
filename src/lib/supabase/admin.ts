import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let admin: SupabaseClient | undefined;

/**
 * Service-role client for server code only. Tables have RLS on with no
 * policies, so this is the only way to read or write them; every query
 * built on it must scope by the signed-in user's id.
 */
export function supabaseAdmin(): SupabaseClient {
  admin ??= createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
