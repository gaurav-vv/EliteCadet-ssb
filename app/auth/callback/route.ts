import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPasswordSetupSession, safeNextPath } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Never `${origin}${next}` with a raw value: "@evil.com" or "//evil.com"
  // would turn this into an open redirect.
  const explicitNext = safeNextPath(searchParams.get("next"));
  const next = explicitNext ?? (type === "recovery" ? "/reset-password" : "/");
  const isRecovery = type === "recovery" || next === "/reset-password";

  const supabase = await createClient();
  // An explicit `next` always wins (e.g. sign-up → /onboarding). A link that
  // lost it — Supabase's Site URL fallback for a redirect that isn't
  // allow-listed — goes to "Set a new password" when the session came from an
  // email link (reset/invite), never to the home page with a live session.
  const destination = (session: { access_token?: string } | null | undefined) =>
    NextResponse.redirect(`${origin}${!explicitNext && isPasswordSetupSession(session?.access_token) ? "/reset-password" : next}`);

  // Browser-initiated flows (sign-up confirmation, password reset requested
  // from this site) arrive with a PKCE `code`; its verifier is a cookie set
  // by the browser client on this same origin.
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return destination(data?.session);
    }
    console.error("[auth] code exchange failed", { code: error.code, status: error.status });
  }

  // Email templates that link with `token_hash` + `type` (works from any
  // device or browser — no PKCE verifier needed) are verified directly here.
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return destination(data?.session);
    }
    console.error("[auth] token verification failed", { code: error.code, status: error.status });
  }

  // Expired, already-used or malformed link (Supabase also lands here with
  // ?error=…&error_code=otp_expired). A failed reset goes back to the reset
  // request form, where the user can simply ask for a new link.
  if (isRecovery) {
    return NextResponse.redirect(`${origin}/forgot-password?reason=link_invalid`);
  }
  return NextResponse.redirect(`${origin}/login?reason=link_invalid`);
}
