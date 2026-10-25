// @vitest-environment jsdom
// lib/api/auth.ts against a faked Supabase browser client: every login,
// signup and password-reset branch the UI depends on.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

import {
  ACCOUNT_UNAVAILABLE_MESSAGE,
  PROFILE_MISSING_MESSAGE,
  establishRecoverySession,
  logIn,
  requestPasswordReset,
  signUp,
  updatePassword,
} from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/client";

type AuthError = { code?: string; status?: number; message: string; name?: string } | null;

function fake(opts: {
  signIn?: { user: { id: string } | null; error: AuthError };
  profile?: { data: unknown; error: { code: string; message: string } | null };
  signUp?: { data: { user: unknown; session: unknown }; error: AuthError };
  reset?: { error: AuthError };
  update?: { error: AuthError };
  setSession?: { error: AuthError };
  user?: { id: string } | null;
  // How the current session was created (the token's amr), as Supabase stamps it.
  sessionMethod?: string;
}) {
  const accessToken = `h.${Buffer.from(JSON.stringify({ amr: [{ method: opts.sessionMethod ?? "otp", timestamp: 1 }] })).toString("base64url")}.s`;
  const auth = {
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: opts.signIn?.user ?? null }, error: opts.signIn?.error ?? null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue(opts.signUp ?? { data: { user: null, session: null }, error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue(opts.reset ?? { error: null }),
    updateUser: vi.fn().mockResolvedValue(opts.update ?? { error: null }),
    setSession: vi.fn().mockResolvedValue(opts.setSession ?? { error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: opts.user ?? null } }),
    getSession: vi.fn().mockResolvedValue({ data: { session: opts.user ? { access_token: accessToken } : null } }),
  };
  const maybeSingle = vi.fn().mockResolvedValue(opts.profile ?? { data: null, error: null });
  vi.mocked(createClient).mockReturnValue({
    auth,
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
  } as unknown as ReturnType<typeof createClient>);
  return auth;
}

const creds = { email: "cadet@example.com", password: "correcthorse" };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.history.replaceState(null, "", "/reset-password");
});

describe("logIn", () => {
  it("returns the profile's role on success", async () => {
    const auth = fake({ signIn: { user: { id: "u1" }, error: null }, profile: { data: { role: "mentor", status: "active", academy: null }, error: null } });
    expect(await logIn(creds)).toEqual({ ok: true, data: { role: "mentor" } });
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without looking up a profile", async () => {
    fake({ signIn: { user: null, error: { code: "invalid_credentials", status: 400, message: "Invalid login credentials" } } });
    expect(await logIn(creds)).toEqual({ ok: false, error: { code: "invalid_credentials", message: "Incorrect email or password." } });
  });

  it("explains an unconfirmed email instead of calling it a wrong password", async () => {
    fake({ signIn: { user: null, error: { code: "email_not_confirmed", status: 400, message: "Email not confirmed" } } });
    expect((await logIn(creds)).error?.code).toBe("email_not_confirmed");
  });

  it("signs out and reports a missing profile — never defaults to 'student'", async () => {
    const auth = fake({ signIn: { user: { id: "u1" }, error: null }, profile: { data: null, error: null } });
    expect(await logIn(creds)).toEqual({ ok: false, error: { code: "profile_missing", message: PROFILE_MISSING_MESSAGE } });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("signs out and reports an outage when the profile query fails (missing column)", async () => {
    const auth = fake({
      signIn: { user: { id: "u1" }, error: null },
      profile: { data: null, error: { code: "42703", message: "column profiles.status does not exist" } },
    });
    expect(await logIn(creds)).toEqual({ ok: false, error: { code: "account_unavailable", message: ACCOUNT_UNAVAILABLE_MESSAGE } });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("logs the failed lookup as one readable line with the database code, never a bare {}", async () => {
    fake({
      signIn: { user: { id: "u1" }, error: null },
      profile: { data: null, error: { code: "42703", message: "column profiles.status does not exist" } },
    });
    await logIn(creds);
    const call = vi.mocked(console.error).mock.calls.find(([first]) => String(first).includes("profile lookup failed after sign-in"));
    expect(call).toHaveLength(1);
    expect(call![0]).toContain("code=42703");
    expect(call![0]).toContain("column profiles.status does not exist");
    expect(call![0]).toContain("apply the pending supabase/migrations");
    expect(call![0]).not.toContain(creds.email);
  });

  it("refuses an unrecognised role", async () => {
    const auth = fake({ signIn: { user: { id: "u1" }, error: null }, profile: { data: { role: "owner", status: "active" }, error: null } });
    expect((await logIn(creds)).error?.code).toBe("profile_missing");
    expect(auth.signOut).toHaveBeenCalled();
  });
});

describe("signUp", () => {
  const input = { email: "new@example.com", password: "correcthorse", fullName: "New Cadet", role: "student" as const };

  it("signs straight in when email confirmation is off", async () => {
    const auth = fake({ signUp: { data: { user: { id: "u1" }, session: { access_token: "t" } }, error: null } });
    expect(await signUp(input)).toEqual({ ok: true, data: { role: "student", needsConfirmation: false } });
    const options = auth.signUp.mock.calls[0][0].options;
    expect(options.emailRedirectTo).toBe(`${window.location.origin}/auth/callback?next=%2Fonboarding`);
    expect(options.data).toMatchObject({ full_name: "New Cadet", role: "student" });
  });

  it("asks the user to confirm their email when no session is returned", async () => {
    fake({ signUp: { data: { user: { id: "u1" }, session: null }, error: null } });
    expect(await signUp(input)).toEqual({ ok: true, data: { role: "student", needsConfirmation: true } });
  });

  it("reports a failed profile trigger as a plain retry message", async () => {
    fake({ signUp: { data: { user: null, session: null }, error: { code: "unexpected_failure", status: 500, message: "Database error saving new user" } } });
    expect(await signUp(input)).toEqual({ ok: false, error: { code: "unknown_error", message: "We couldn't create your account. Please try again." } });
  });
});

describe("requestPasswordReset", () => {
  it("sends the reset link back through /auth/callback to /reset-password on this origin", async () => {
    const auth = fake({});
    expect(await requestPasswordReset("cadet@example.com")).toEqual({ ok: true, data: null });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("cadet@example.com", {
      redirectTo: `${window.location.origin}/auth/callback?next=%2Freset-password`,
    });
  });

  it("does not claim the email was sent when Supabase refuses (e.g. redirect not allow-listed, SMTP down)", async () => {
    fake({ reset: { error: { code: "unexpected_failure", status: 500, message: "Error sending recovery email" } } });
    expect((await requestPasswordReset("cadet@example.com")).ok).toBe(false);
  });

  it("keeps the built-in mailer's refusal generic on screen but explains the fix in the console", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    fake({ reset: { error: { code: "email_address_not_authorized", status: 400, message: "Email address not authorized" } } });
    const result = await requestPasswordReset("cadet@gmail.com");
    expect(result.ok).toBe(false);
    expect(result.error?.message).not.toMatch(/organization|authorized|account/i);
    expect(JSON.stringify(log.mock.calls)).toMatch(/custom SMTP/);
    expect(JSON.stringify(log.mock.calls)).not.toContain("cadet@gmail.com");
    log.mockRestore();
  });

  it("reports rate limiting", async () => {
    fake({ reset: { error: { code: "over_email_send_rate_limit", status: 429, message: "rate limit" } } });
    expect((await requestPasswordReset("cadet@example.com")).error?.code).toBe("rate_limited");
  });

  it("validates the email before calling Supabase", async () => {
    const auth = fake({});
    expect((await requestPasswordReset("nope")).error?.code).toBe("validation_error");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  it("updates the password, then signs out so the user logs in with it", async () => {
    const auth = fake({});
    expect(await updatePassword("brandnewpass")).toEqual({ ok: true, data: null });
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "brandnewpass" });
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("maps a missing recovery session to an expired link", async () => {
    fake({ update: { error: { name: "AuthSessionMissingError", message: "Auth session missing!", status: 400 } } });
    expect((await updatePassword("brandnewpass")).error?.code).toBe("link_expired");
  });

  it("asks for a different password when it is unchanged", async () => {
    fake({ update: { error: { code: "same_password", status: 422, message: "same" } } });
    expect((await updatePassword("brandnewpass")).error?.code).toBe("same_password");
  });
});

describe("establishRecoverySession", () => {
  it("is ready when /auth/callback already created the session", async () => {
    fake({ user: { id: "u1" } });
    expect(await establishRecoverySession()).toBe("ready");
  });

  it("is ready for a PKCE reset session (recovery) and an implicit/token_hash one (otp)", async () => {
    fake({ user: { id: "u1" }, sessionMethod: "recovery" });
    expect(await establishRecoverySession()).toBe("ready");
    fake({ user: { id: "u1" }, sessionMethod: "otp" });
    expect(await establishRecoverySession()).toBe("ready");
  });

  it("refuses an ordinary password session: changing the password needs a reset/invite link", async () => {
    fake({ user: { id: "u1" }, sessionMethod: "password" });
    expect(await establishRecoverySession()).toBe("invalid");
  });

  it("is invalid with no session (link opened twice, expired, or another browser)", async () => {
    fake({ user: null });
    expect(await establishRecoverySession()).toBe("invalid");
  });

  it("adopts tokens from the URL hash and strips them from the address bar", async () => {
    window.history.replaceState(null, "", "/reset-password#access_token=AT&refresh_token=RT&type=invite");
    const auth = fake({ user: { id: "u1" } });
    expect(await establishRecoverySession()).toBe("ready");
    expect(auth.setSession).toHaveBeenCalledWith({ access_token: "AT", refresh_token: "RT" });
    expect(window.location.hash).toBe("");
  });

  it("shares one attempt between overlapping calls (StrictMode runs the effect twice)", async () => {
    window.history.replaceState(null, "", "/reset-password#access_token=AT&refresh_token=RT&type=invite");
    const auth = fake({ user: { id: "u1" } });
    let finish!: () => void;
    auth.setSession.mockReturnValue(new Promise((resolve) => (finish = () => resolve({ error: null }))));
    const first = establishRecoverySession();
    const second = establishRecoverySession(); // hash already stripped by the first call
    finish();
    expect(await Promise.all([first, second])).toEqual(["ready", "ready"]);
    expect(auth.setSession).toHaveBeenCalledTimes(1);
  });

  it("is invalid when Supabase reports an expired link in the hash", async () => {
    window.history.replaceState(null, "", "/reset-password#error=access_denied&error_code=otp_expired");
    const auth = fake({ user: { id: "u1" } });
    expect(await establishRecoverySession()).toBe("invalid");
    expect(auth.setSession).not.toHaveBeenCalled();
  });
});
