import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { describeLookupFailure, loadAccountAccess } from "@/lib/auth/account";
import { roleForPath } from "@/lib/auth/redirect";
import { getVerifiedUser } from "@/lib/supabase/claims";
import { publicSupabaseEnv } from "@/lib/supabase/env";

// Re-exported for the existing unit tests (tests/unit/lib/middleware-role.test.ts);
// the mapping itself lives in lib/auth/redirect.ts so the login form shares it.
export { roleForPath };

// True when the browser sent a Supabase auth cookie (`sb-<ref>-auth-token`,
// possibly chunked `.0`, `.1`, or the PKCE `-code-verifier`).
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
}

export async function updateSession(request: NextRequest) {
  const requiredRole = roleForPath(request.nextUrl.pathname);

  // An email link that Supabase sent to the Site URL instead of
  // /auth/callback (its fallback when the redirect URL isn't allow-listed)
  // arrives as "/?code=…" (or "/?token_hash=…&type=…"). Hand it to the
  // callback, which exchanges it and routes resets to "Set a new password".
  const params = request.nextUrl.searchParams;
  if (request.nextUrl.pathname === "/" && (params.has("code") || (params.has("token_hash") && params.has("type")))) {
    const callback = request.nextUrl.clone();
    callback.pathname = "/auth/callback";
    return NextResponse.redirect(callback);
  }

  // A public page with no auth cookie has no session to refresh and nothing to
  // authorize, so skip the Supabase round trip (auth verification can be a network
  // call). This must stay AFTER the email-link redirect above: a new user
  // opening a confirmation/reset link has no cookie yet. Protected routes and
  // anyone carrying a cookie take the full path.
  if (!requiredRole && !hasAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const { url, anonKey } = publicSupabaseEnv();
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Verified locally from the token's signature (no Auth round trip); the
  // profile lookup below stays authoritative for role and account status.
  const user = await getVerifiedUser(supabase);

  if (!requiredRole) {
    return response;
  }

  const toLogin = (reason: string, keepNext: boolean) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    if (keepNext) redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    redirectUrl.searchParams.set("reason", reason);
    const redirect = NextResponse.redirect(redirectUrl);
    // Carry any refreshed/cleared auth cookies onto the redirect.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!user) {
    return toLogin("login_required", true);
  }

  const access = await loadAccountAccess(supabase, user.id);

  switch (access.kind) {
    case "lookup_failed":
      // An outage or schema mismatch, not a permission decision: never
      // /forbidden. The session is kept so a retry works once it recovers;
      // /login is public, so this cannot loop.
      console.error(`[auth] profile lookup failed in proxy: ${describeLookupFailure("proxy", access)}`);
      return toLogin("account_unavailable", true);
    case "missing_profile":
      console.error("[auth] signed-in user has no profile row", { userId: user.id });
      await supabase.auth.signOut();
      return toLogin("profile_missing", false);
    case "blocked":
      // A suspended account, or any non-super-admin member of a suspended
      // academy, is signed out on its next request, whatever the route.
      await supabase.auth.signOut();
      return toLogin(access.reason, false);
    case "unknown_role":
      break;
    case "ok":
      if (access.role === requiredRole) return response;
      break;
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/forbidden";
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}
