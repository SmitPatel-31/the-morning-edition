/**
 * Server-side environment access. Each getter throws a readable error when
 * the variable is missing, so a misconfigured deploy fails at the call site
 * with a message that names the variable.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export const env = {
  composioApiKey: () => required("COMPOSIO_API_KEY"),
  geminiApiKey: () => required("GEMINI_API_KEY"),
  geminiModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  cronSecret: () => required("CRON_SECRET"),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || undefined,
};
