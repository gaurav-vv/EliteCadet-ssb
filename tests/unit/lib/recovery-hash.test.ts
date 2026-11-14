// @vitest-environment node
import { describe, expect, it } from "vitest";
import { recoveryRedirectFor } from "@/lib/auth/recovery-hash";
import { validateNewPasswordForm } from "@/lib/auth/validation";

const TOKENS = "access_token=AAA.BBB.CCC&refresh_token=rrr&expires_in=3600&token_type=bearer";

describe("recoveryRedirectFor: a reset link that landed on the wrong page", () => {
  it("carries a recovery link's tokens from the home page to the reset page, hash intact", () => {
    expect(recoveryRedirectFor(`#${TOKENS}&type=recovery`, "/")).toBe(`/reset-password#${TOKENS}&type=recovery`);
  });

  it("does the same for an invite", () => {
    expect(recoveryRedirectFor(`#${TOKENS}&type=invite`, "/login")).toBe(`/reset-password#${TOKENS}&type=invite`);
  });

  it("sends an expired or used link, reported in the hash, to the page that asks for a new one", () => {
    expect(recoveryRedirectFor("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", "/")).toBe("/forgot-password?reason=link_invalid");
  });

  it("leaves everything else alone", () => {
    expect(recoveryRedirectFor("", "/")).toBeNull();
    expect(recoveryRedirectFor("#section-2", "/")).toBeNull();
    expect(recoveryRedirectFor("#type=recovery", "/")).toBeNull(); // no tokens at all
    expect(recoveryRedirectFor("#access_token=a&type=recovery", "/")).toBeNull(); // half a session
    expect(recoveryRedirectFor(`#${TOKENS}&type=magiclink`, "/")).toBeNull(); // not a recovery or invite
    expect(recoveryRedirectFor("#error=access_denied", "/")).toBeNull(); // not about a link
  });

  it("does not interfere with the pages that handle their own hash", () => {
    for (const path of ["/reset-password", "/forgot-password", "/auth/callback"]) {
      expect(recoveryRedirectFor(`#${TOKENS}&type=recovery`, path)).toBeNull();
      expect(recoveryRedirectFor("#error=access_denied&error_code=otp_expired", path)).toBeNull();
    }
  });

  it("only ever answers with a path on this site, whatever the hash says", () => {
    for (const hash of [`#${TOKENS}&type=recovery&next=//evil.com`, `#${TOKENS}&type=recovery&redirect_to=https://evil.com`, `#${TOKENS}&type=recovery#//evil.com`]) {
      // Either no redirect (a malformed hash is ignored) or a fixed on-site path: never anywhere else.
      const target = recoveryRedirectFor(hash, "/");
      expect(target === null || (target.startsWith("/reset-password#") && !target.startsWith("//"))).toBe(true);
    }
  });
});

describe("validateNewPasswordForm", () => {
  it("accepts a long enough password that matches its confirmation", () => {
    expect(validateNewPasswordForm({ password: "correcthorse", confirm: "correcthorse" })).toEqual({});
  });

  it("requires a password and a confirmation", () => {
    expect(validateNewPasswordForm({ password: "", confirm: "" })).toEqual({ password: "Password is required.", confirm: "Confirm your new password." });
  });

  it("rejects a weak (too short) password", () => {
    expect(validateNewPasswordForm({ password: "short", confirm: "short" })).toEqual({ password: "Password must be at least 6 characters." });
  });

  it("rejects a mismatch, and is case sensitive", () => {
    expect(validateNewPasswordForm({ password: "correcthorse", confirm: "correcthorsE" })).toEqual({ confirm: "The passwords don't match." });
  });
});
