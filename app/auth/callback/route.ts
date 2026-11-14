import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  // The address the browser used (Host header), not request.url's: `next dev`
  // reports its own bind address (localhost) there, which sent a phone opening
  // an email link at this computer's Wi-Fi address to its own "localhost",
  // away from the session cookie just set. A browser always sends the real
  // Host of the link it opened, so a link can't point this elsewhere; `next`
  // stays a safe relative path (below).
  const url = new URL(request.url);
  const { searchParams } = url;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(/:$/, "");
  const origin = `${proto}://${host}`;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Never `${origin}${next}` with a raw value: "@evil.com" or "//evil.com"
  // would turn this into an open redirect.
  const next = safeNextPath(searchParams.get("next")) ?? (type === "recovery" ? "/reset-password" : "/");
  const isRecovery = type === "recovery" || next === "/reset-password";

  const supabase = await createClient();

  // Browser-initiated flows (sign-up confirmation, password reset requested
  // from this site) arrive with a PKCE `code`; its verifier is a cookie set
  // by the browser client on this same origin.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth] code exchange failed", { code: error.code, status: error.status });
  }

  // Email templates that link with `token_hash` + `type` (works from any
  // device or browser — no PKCE verifier needed) are verified directly here.
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
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
