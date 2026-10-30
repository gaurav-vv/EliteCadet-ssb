// A recovery link can land on the wrong page. When Supabase can't honour the `redirectTo` we asked for
// (it isn't in the project's Redirect URLs list) it falls back to the Site URL, which is the home page.
// Links that carry their result in the URL *hash* (an implicit-flow link, or an invite sent by the service
// role) never reach the server, because browsers don't send the hash, so the proxy can't forward them the
// way it forwards `/?code=…`. This reads the hash in the browser and says where it belongs.
//
// It only decides WHERE to go, always to a fixed same-site path. It never reads, trusts or stores a token:
// /reset-password still turns the hash into a session through Supabase (setSession verifies the token) and
// only a session that really came from a reset or invite email may set a password.

const HASH_RESET_PATH = "/reset-password";
const HASH_EXPIRED_PATH = "/forgot-password?reason=link_invalid";

// Pages that already handle (or must never be redirected away from) a recovery hash.
const HANDLES_OWN_HASH = new Set(["/reset-password", "/forgot-password", "/auth/callback"]);

export function recoveryRedirectFor(hash: string, pathname: string): string | null {
  if (!hash || HANDLES_OWN_HASH.has(pathname)) return null;
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const type = params.get("type");
  const hasTokens = Boolean(params.get("access_token") && params.get("refresh_token"));

  // A recovery or invite link whose tokens arrived on the wrong page: carry the hash to the reset page.
  if (hasTokens && (type === "recovery" || type === "invite")) return `${HASH_RESET_PATH}${hash.startsWith("#") ? hash : `#${hash}`}`;

  // Supabase's own refusal of a reset link (expired or already used) on the wrong page.
  const errorCode = params.get("error_code");
  if (errorCode === "otp_expired" || (params.get("error") === "access_denied" && errorCode)) return HASH_EXPIRED_PATH;
  return null;
}
