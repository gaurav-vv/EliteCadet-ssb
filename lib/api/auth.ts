// Client-callable auth operations (AGENTS.md §9) — the only place browser
// code talks to Supabase Auth directly. Logout and other server-only auth
// work lives in lib/auth/actions.ts as Server Actions.

import { createClient } from "@/lib/supabase/client";
import { describeLookupFailure, loadAccountAccess } from "@/lib/auth/account";
import type { AuthResult, LoginInput, SignupInput } from "@/types/auth";

export const SUSPENDED_MESSAGE = "This account has been suspended. Contact your academy or the platform team for help.";

export const ACADEMY_SUSPENDED_MESSAGE = "Your academy's access is paused. Contact your academy or the platform team for help.";

export const ACCOUNT_UNAVAILABLE_MESSAGE = "We couldn't load your account right now. Please try again in a few minutes.";

export const PROFILE_MISSING_MESSAGE =
  "Your sign-in worked, but your account isn't fully set up. Contact your academy or the platform team for help.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateSignupInput(input: SignupInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  const passwordError = validatePassword(input.password);
  if (passwordError) errors.password = passwordError;
  if (!input.fullName.trim()) errors.fullName = "Name is required.";
  if (input.role === "academy_admin" && !input.academyName?.trim()) {
    errors.academyName = "Academy name is required.";
  }
  return errors;
}

export function validateLoginInput(input: LoginInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = "Password is required.";
  return errors;
}

// Every email link comes back through /auth/callback on the SAME origin the
// request was made from: the PKCE code verifier is a cookie on that origin,
// so a different host (www vs apex, a fixed env URL) would break the exchange.
// Each origin used must be in Supabase → Auth → URL Configuration → Redirect URLs.
function callbackUrl(next: string): string {
  return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function isRateLimited(error: { status?: number; code?: string }): boolean {
  return error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit";
}

export async function signUp(input: SignupInput): Promise<AuthResult<{ role: string; needsConfirmation: boolean }>> {
  const fieldErrors = validateSignupInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: callbackUrl(input.role === "academy_admin" ? "/academy" : "/onboarding"),
        // The role here is only a request: the handle_new_user trigger
        // (0005/0007) honours "academy_admin" or falls back to "student" and
        // never trusts any other role from browser-controlled metadata.
        data: {
          full_name: input.fullName,
          role: input.role,
          academy_name: input.academyName ?? null,
        },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered") || error.code === "user_already_exists") {
        return { ok: false, error: { code: "email_in_use", message: "An account with this email already exists." } };
      }
      if (error.code === "weak_password") {
        return { ok: false, error: { code: "weak_password", message: "Choose a stronger password." } };
      }
      if (isRateLimited(error)) {
        return { ok: false, error: { code: "rate_limited", message: "Too many attempts. Please wait a few minutes and try again." } };
      }
      // e.g. "Database error saving new user" — the profile trigger failed.
      console.error("[auth] sign-up failed", { code: error.code, status: error.status });
      return { ok: false, error: { code: "unknown_error", message: "We couldn't create your account. Please try again." } };
    }

    // With "Confirm email" on, Supabase returns a user but no session until
    // the emailed link is opened (for an already-registered email it returns
    // the same shape, so this never reveals whether an email is in use).
    if (!data.session) {
      return { ok: true, data: { role: input.role, needsConfirmation: true } };
    }

    return { ok: true, data: { role: input.role, needsConfirmation: false } };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}

export async function logIn(input: LoginInput): Promise<AuthResult<{ role: string }>> {
  const fieldErrors = validateLoginInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: { code: "validation_error", message: Object.values(fieldErrors)[0] } };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase.auth.signInWithPassword(input);

    if (error) {
      if (error.code === "email_not_confirmed") {
        return { ok: false, error: { code: "email_not_confirmed", message: "Confirm your email first — open the link we sent you, then log in." } };
      }
      if (isRateLimited(error)) {
        return { ok: false, error: { code: "rate_limited", message: "Too many attempts. Please wait a few minutes and try again." } };
      }
      if (error.code === "invalid_credentials" || error.status === 400) {
        return { ok: false, error: { code: "invalid_credentials", message: "Incorrect email or password." } };
      }
      console.error("[auth] sign-in failed", { code: error.code, status: error.status });
      return { ok: false, error: { code: "unknown_error", message: "We couldn't log you in right now. Please try again." } };
    }

    const access = await loadAccountAccess(supabase, data.user.id);

    if (access.kind === "ok") {
      return { ok: true, data: { role: access.role } };
    }

    // Anything else ends the half-made session, so the user is never left
    // signed in with nowhere to go (which is how they used to reach /forbidden).
    await supabase.auth.signOut();

    switch (access.kind) {
      case "blocked":
        return {
          ok: false,
          error: { code: "account_suspended", message: access.reason === "academy_suspended" ? ACADEMY_SUSPENDED_MESSAGE : SUSPENDED_MESSAGE },
        };
      case "lookup_failed":
        console.error(`[auth] profile lookup failed after sign-in: ${describeLookupFailure("login", access)}`);
        return { ok: false, error: { code: "account_unavailable", message: ACCOUNT_UNAVAILABLE_MESSAGE } };
      case "missing_profile":
      case "unknown_role":
        console.error("[auth] signed-in user has no usable profile", { kind: access.kind });
        return { ok: false, error: { code: "profile_missing", message: PROFILE_MISSING_MESSAGE } };
    }
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}

export async function requestPasswordReset(email: string): Promise<AuthResult<null>> {
  const emailError = validateEmail(email);
  if (emailError) {
    return { ok: false, error: { code: "validation_error", message: emailError } };
  }

  const supabase = createClient();

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl("/reset-password"),
    });

    if (error) {
      // Rate limits are about the requester, not the account, so saying so
      // doesn't reveal whether the email exists. Other errors (e.g. a redirect
      // URL missing from Supabase's allowlist, or SMTP failing) are logged and
      // reported as a failure — never as "email sent".
      if (isRateLimited(error)) {
        return { ok: false, error: { code: "rate_limited", message: "Too many reset requests. Please wait a few minutes and try again." } };
      }
      console.error("[auth] password reset request failed", { code: error.code, status: error.status });
      return { ok: false, error: { code: "unknown_error", message: "We couldn't send the reset email right now. Please try again shortly." } };
    }
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }

  return { ok: true, data: null };
}

export async function updatePassword(password: string): Promise<AuthResult<null>> {
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { ok: false, error: { code: "validation_error", message: passwordError } };
  }

  const supabase = createClient();

  try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      if (error.code === "same_password") {
        return { ok: false, error: { code: "same_password", message: "Choose a password different from your current one." } };
      }
      if (error.code === "weak_password") {
        return { ok: false, error: { code: "weak_password", message: "Choose a stronger password." } };
      }
      if (error.code === "session_not_found" || error.name === "AuthSessionMissingError") {
        return { ok: false, error: { code: "link_expired", message: "Your reset link has expired. Request a new one." } };
      }
      console.error("[auth] password update failed", { code: error.code, status: error.status });
      return { ok: false, error: { code: "unknown_error", message: "We couldn't update your password. Please try again." } };
    }
    // A reset ends with a fresh login using the new password.
    await supabase.auth.signOut();
    return { ok: true, data: null };
  } catch {
    return { ok: false, error: { code: "network_error", message: "Network error. Check your connection and try again." } };
  }
}

// For the reset page: turns whatever the email link delivered into a
// recovery session. /auth/callback has already handled ?code= and
// ?token_hash=; this covers links that put tokens (or an error) in the URL
// hash — e.g. invites sent by the service role, which carry no PKCE verifier.
//
// One attempt at a time: the hash is read and stripped once, so a second call
// while the first is still running (React StrictMode runs effects twice in
// development) must share the first call's result. Without this, the second
// call saw an empty hash, checked for a user before setSession finished, and
// showed a valid invite as "expired".
let recoveryAttempt: Promise<"ready" | "invalid"> | null = null;

export function establishRecoverySession(): Promise<"ready" | "invalid"> {
  recoveryAttempt ??= readRecoverySession().finally(() => {
    recoveryAttempt = null;
  });
  return recoveryAttempt;
}

async function readRecoverySession(): Promise<"ready" | "invalid"> {
  const supabase = createClient();
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  if (hash.get("error") || hash.get("error_code")) {
    window.history.replaceState(null, "", window.location.pathname);
    return "invalid";
  }

  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if (accessToken && refreshToken) {
    // Never leave tokens sitting in the address bar or browser history.
    window.history.replaceState(null, "", window.location.pathname);
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) return "invalid";
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? "ready" : "invalid";
}
