import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Thrown instead of supabase-js's bare "supabaseKey is required." so callers
// can show an actionable message. Carries variable NAMES only, never values.
export class AdminClientConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`Supabase admin client is not configured: missing ${missing.join(", ")} (server-side environment).`);
    this.name = "AdminClientConfigError";
  }
}

// Names of the server-side variables the admin client needs that are unset.
export function missingAdminConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

// Service-role client — bypasses Row Level Security. Server-side only
// (Server Actions / Route Handlers), never imported by a "use client" file.
// Used only for admin-only operations the anon key cannot perform, such as
// inviting a mentor by email. There is deliberately no fallback key: the
// anon key cannot stand in for the service role.
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  const missing = missingAdminConfig();
  if (missing.length > 0) {
    throw new AdminClientConfigError(missing);
  }
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
