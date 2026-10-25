import { describe, expect, it } from "vitest";
import { isPasswordSetupSession, postLoginPath, safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  it.each(["/student/practice", "/academy?tab=1", "/"])("keeps the same-origin path %s", (next) => {
    expect(safeNextPath(next)).toBe(next);
  });

  it.each([null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "@evil.com", "javascript:alert(1)", "/\u0000x"])(
    "rejects %s",
    (next) => {
      expect(safeNextPath(next)).toBeNull();
    },
  );
});

describe("postLoginPath", () => {
  it("honours a next page the role may open", () => {
    expect(postLoginPath("student", "/student/practice")).toBe("/student/practice");
    expect(postLoginPath("mentor", "/resources")).toBe("/resources");
  });

  it("ignores a next page from another role's workspace instead of landing on /forbidden", () => {
    expect(postLoginPath("mentor", "/student/practice")).toBe("/mentor");
    expect(postLoginPath("student", "/admin")).toBe("/student");
  });

  it("never sends a signed-in user back to an auth page (no loops)", () => {
    for (const next of ["/login", "/signup", "/forbidden", "/reset-password", "/auth/callback", "/dev-preview/super_admin"]) {
      expect(postLoginPath("academy_admin", next)).toBe("/academy");
    }
  });

  it("falls back to the dashboard for unsafe next values", () => {
    expect(postLoginPath("super_admin", "//evil.com/admin")).toBe("/admin");
  });
});

describe("isPasswordSetupSession", () => {
  const token = (amr: unknown) => `h.${Buffer.from(JSON.stringify({ amr })).toString("base64url")}.s`;
  it("is true for email-link sessions (what Supabase really stamps), false for password logins", () => {
    // Observed on local GoTrue: reset and invite links → "otp"; PKCE reset → "recovery".
    expect(isPasswordSetupSession(token([{ method: "otp" }]))).toBe(true);
    expect(isPasswordSetupSession(token([{ method: "recovery" }]))).toBe(true);
    expect(isPasswordSetupSession(token([{ method: "invite" }]))).toBe(true);
    expect(isPasswordSetupSession(token([{ method: "password" }]))).toBe(false);
    expect(isPasswordSetupSession(token([{ method: "oauth" }]))).toBe(false);
  });
  it("is false for missing or malformed tokens", () => {
    expect(isPasswordSetupSession(undefined)).toBe(false);
    expect(isPasswordSetupSession("not-a-jwt")).toBe(false);
    expect(isPasswordSetupSession("a.%%%.b")).toBe(false);
  });
});
