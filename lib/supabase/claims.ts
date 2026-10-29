import type { SupabaseClient } from "@supabase/supabase-js";

export interface VerifiedUser {
  id: string;
  email: string | null;
}

// Who is signed in, from the session's access token with its SIGNATURE and
// expiry verified, instead of `auth.getUser()` (which is a network call to
// Supabase Auth on every request).
//
//  * With an asymmetric signing key (this project's JWKS is ES256) the token is
//    verified locally against the project's public keys, which the SDK caches in
//    memory; no per-request round trip. The SDK itself falls back to a
//    `getUser()` call for symmetric (HS256) keys, so this is correct on any project.
//  * A token about to expire is refreshed first, exactly as before, so the
//    proxy's cookie refresh keeps working.
//  * Never decode the cookie yourself: only `getClaims()` checks the signature.
//
// What this does NOT tell you: whether the session was revoked on the server
// (sign-out elsewhere) since the token was issued; that token stays valid
// until it expires (default 1 hour). Account status, role and academy
// suspension are never read from claims: callers still look them up in
// `profiles` on every request, so a suspension takes effect immediately.
// Security-sensitive account changes (password, email) keep using `getUser()`.
export async function getVerifiedUser(supabase: Pick<SupabaseClient, "auth">): Promise<VerifiedUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;
  const { sub, email } = data.claims;
  if (typeof sub !== "string" || !sub) return null;
  return { id: sub, email: typeof email === "string" && email ? email : null };
}
