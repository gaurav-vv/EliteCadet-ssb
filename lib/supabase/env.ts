// Public Supabase settings shared by the browser, server and proxy clients.
// Each variable is referenced literally so Next.js inlines it into browser
// bundles. A missing value throws a message naming the variable (never a
// value) instead of supabase-js's bare "supabaseUrl is required."
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    throw new Error(`Supabase is not configured: missing ${missing.join(", ")}. Copy .env.example to .env.local and fill it in.`);
  }
  return { url: url!, anonKey: anonKey! };
}

// Where auth emails really go when the app talks to a LOCAL Supabase stack
// (`npx supabase start`): the local Auth server has no outgoing SMTP unless
// [auth.email.smtp] is set up in supabase/config.toml, so invites and reset
// emails are captured by Mailpit ([local_smtp] port 54324) instead of being
// delivered. Null for any hosted project. Lets "sent" messages say so honestly.
export function localMailboxUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return host === "127.0.0.1" || host === "localhost" ? `http://${host}:54324` : null;
}
