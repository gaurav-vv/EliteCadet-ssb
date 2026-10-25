import type { Role } from "@/types/auth";

export function dashboardPathForRole(role: string): string {
  switch (role as Role) {
    case "mentor":
      return "/mentor";
    case "academy_admin":
      return "/academy";
    case "super_admin":
      return "/admin";
    case "student":
    default:
      return "/student";
  }
}

// The role a protected route requires, or null for a public route. Pure, so
// the proxy, the login form and the auth callback share one mapping (tested
// in tests/unit/lib/middleware-role.test.ts — it is the proxy's entire
// authorization surface).
export function roleForPath(pathname: string): Role | null {
  // Anchored, unlike the older prefixes below (see the KNOWN GAP test).
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "super_admin";
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/") || pathname.startsWith("/student")) {
    return "student";
  }
  if (pathname.startsWith("/mentor")) return "mentor";
  if (pathname.startsWith("/academy")) return "academy_admin";
  return null;
}

const BASE = "http://next.invalid";

// A same-origin path from an untrusted `next` parameter, or null. Rejects
// absolute URLs, protocol-relative ("//evil.com") and backslash tricks that
// browsers normalise into another host.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (/[\\\u0000-\u001f]/.test(next)) return null;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

// Supabase stamps how a session was created in the access token's `amr`
// claim. Verified on the local stack (GoTrue, 2026-10-25): reset and invite
// links both produce "otp" (implicit and token_hash flows); PKCE resets are
// recorded as "recovery"; a password login is "password". This app sends no
// magic links, so an email-link session is a reset, an invite or (if email
// confirmation is ever enabled) a sign-up confirmation. Used to (1) route a
// link that lost its `next` to "Set a new password" and (2) only let the
// reset page change a password for a session that came from an email link.
// Not an authorization boundary: Supabase issued the token; this only
// decides where the user goes and what the page offers.
const EMAIL_LINK_METHODS = new Set(["otp", "recovery", "invite", "magiclink"]);

export function isPasswordSetupSession(accessToken: string | undefined): boolean {
  const payload = accessToken?.split(".")[1];
  if (!payload) return false;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as { amr?: { method?: string }[] };
    return (claims.amr ?? []).some((entry) => typeof entry?.method === "string" && EMAIL_LINK_METHODS.has(entry.method));
  } catch {
    return false;
  }
}

// Pages a signed-in user should never be sent back to after logging in —
// following them would just show the login form again (or a dead end).
const AUTH_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password", "/forbidden"];

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname) || pathname.startsWith("/auth/") || pathname.startsWith("/dev-preview");
}

// Where to go after a successful login: the requested `next` page when it is
// safe AND this role may open it, otherwise the role's own dashboard — so a
// stale `next` from another role's workspace never lands on /forbidden.
export function postLoginPath(role: string, next: string | null | undefined): string {
  const safe = safeNextPath(next);
  if (safe) {
    const { pathname } = new URL(safe, BASE);
    const required = roleForPath(pathname);
    if (!isAuthPage(pathname) && (required === null || required === role)) return safe;
  }
  return dashboardPathForRole(role);
}
