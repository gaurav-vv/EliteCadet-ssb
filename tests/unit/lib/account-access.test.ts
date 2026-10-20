// @vitest-environment node
// lib/auth/account.ts: the one profile read behind login and the proxy, and
// the log line it leaves when that read fails. Regression for 2026-10-20: the
// hosted database was still at 0004, PostgREST answered 400 / 42703
// ("column profiles.status does not exist"), and the browser console showed
// only "[auth] profile lookup failed after sign-in {}".
import { describe, expect, it, vi } from "vitest";
import { ACCOUNT_ACCESS_SELECT, describeLookupFailure, loadAccountAccess, lookupFailure, sanitizeDbMessage } from "@/lib/auth/account";

const USER_ID = "22222222-2222-2222-2222-222222222222";

function fakeSupabase(result: { data: unknown; error: unknown; status: number }) {
  const eq = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(result) }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as unknown as Parameters<typeof loadAccountAccess>[0], from, select, eq };
}

describe("loadAccountAccess", () => {
  it("reads the caller's own profile row with the role, status and academy status", async () => {
    const { client, from, select, eq } = fakeSupabase({ data: { role: "student", status: "active", academy: { status: "active" } }, error: null, status: 200 });
    expect(await loadAccountAccess(client, USER_ID)).toEqual({ kind: "ok", role: "student" });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith(ACCOUNT_ACCESS_SELECT);
    expect(eq).toHaveBeenCalledWith("id", USER_ID);
  });

  it("reports a schema mismatch as lookup_failed with the code and HTTP status — not as a missing profile", async () => {
    const { client } = fakeSupabase({
      data: null,
      error: { code: "42703", message: "column profiles.status does not exist", details: null, hint: null },
      status: 400,
    });
    expect(await loadAccountAccess(client, USER_ID)).toEqual({
      kind: "lookup_failed",
      code: "42703",
      message: "column profiles.status does not exist",
      status: 400,
    });
  });

  it("keeps a query that found no row apart from a failed query", async () => {
    const { client } = fakeSupabase({ data: null, error: null, status: 200 });
    expect(await loadAccountAccess(client, USER_ID)).toEqual({ kind: "missing_profile" });
  });

  it("handles an error with no code or message (e.g. a network failure) without throwing", async () => {
    const { client } = fakeSupabase({ data: null, error: { message: "" }, status: 0 });
    expect(await loadAccountAccess(client, USER_ID)).toEqual({ kind: "lookup_failed", code: null, message: null, status: null });
  });
});

describe("describeLookupFailure", () => {
  it("is a single string carrying stage, code, status and message, so no console renders it as {}", () => {
    const line = describeLookupFailure("login", { code: "42703", message: "column academies_1.status does not exist", status: 400 });
    expect(typeof line).toBe("string");
    expect(line).toContain("stage=login");
    expect(line).toContain("code=42703");
    expect(line).toContain("status=400");
    expect(line).toContain('message="column academies_1.status does not exist"');
  });

  it("names the pending migrations as the fix for undefined column / table / relationship errors", () => {
    for (const code of ["42703", "42P01", "PGRST200", "PGRST204", "PGRST205"]) {
      expect(describeLookupFailure("proxy", { code, message: null, status: 400 })).toContain("apply the pending supabase/migrations");
    }
    expect(describeLookupFailure("proxy", { code: "57014", message: "canceling statement due to statement timeout", status: 500 })).not.toContain("hint=");
  });

  it("prints placeholders when the error carried nothing", () => {
    expect(describeLookupFailure("session", { code: null, message: null, status: null })).toBe('stage=session relation=profiles code=none status=none message=""');
  });
});

describe("sanitizeDbMessage / lookupFailure", () => {
  it("masks ids, emails and JWTs quoted back by Postgres, and caps the length", () => {
    const raw = `invalid input syntax for type uuid: "${USER_ID}" for cadet@example.com with eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl`;
    const clean = sanitizeDbMessage(raw)!;
    expect(clean).not.toContain(USER_ID);
    expect(clean).not.toContain("cadet@example.com");
    expect(clean).not.toContain("eyJhbGciOiJIUzI1NiJ9");
    expect(clean).toContain("<id>");
    expect(clean).toContain("<email>");
    expect(clean).toContain("<token>");
    expect(sanitizeDbMessage("x".repeat(1000))).toHaveLength(300);
    expect(sanitizeDbMessage(undefined)).toBeNull();
  });

  it("drops a non-positive status and non-string codes", () => {
    expect(lookupFailure({ code: 42703, message: "m" }, 0)).toEqual({ code: null, message: "m", status: null });
    expect(lookupFailure(null)).toEqual({ code: null, message: null, status: null });
  });
});
