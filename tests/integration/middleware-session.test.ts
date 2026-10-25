// @vitest-environment node
// Integration: updateSession() end to end — real route→role mapping, real
// NextRequest/NextResponse redirects — with only the Supabase client faked.
// Covers the logged-in cases the e2e suite can't reach without seeded
// accounts: wrong role, missing profile, correct role (AGENTS.md §10).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createServerClient);

function fakeSupabase(
  user: { id: string } | null,
  profileRole: string | null,
  status = "active",
  academyStatus: string | null = null,
  queryError: { code: string; message: string } | null = null,
) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: queryError || !profileRole ? null : { role: profileRole, status, academy: academyStatus ? { status: academyStatus } : null },
    error: queryError,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const signOut = vi.fn().mockResolvedValue({ error: null });
  mockedCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }), signOut },
    from,
  } as unknown as ReturnType<typeof createServerClient>);
  return { from, eq, signOut };
}

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function redirectTarget(res: Response): URL | null {
  const location = res.headers.get("location");
  return location ? new URL(location) : null;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  mockedCreateClient.mockReset();
});

describe("updateSession", () => {
  it("lets anyone through to a public route without looking up a profile", async () => {
    const { from } = fakeSupabase(null, null);
    const res = await updateSession(request("/login"));
    expect(redirectTarget(res)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("redirects a logged-out visitor to /login with next and reason", async () => {
    fakeSupabase(null, null);
    const res = await updateSession(request("/mentor/mentees"));
    const target = redirectTarget(res);
    expect(res.status).toBe(307);
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("next")).toBe("/mentor/mentees");
    expect(target?.searchParams.get("reason")).toBe("login_required");
  });

  it("lets a student into /student", async () => {
    const { eq } = fakeSupabase({ id: "u1" }, "student");
    const res = await updateSession(request("/student/practice"));
    expect(redirectTarget(res)).toBeNull();
    expect(eq).toHaveBeenCalledWith("id", "u1");
  });

  it.each([
    ["student", "/mentor"],
    ["student", "/academy/students"],
    ["mentor", "/student"],
    ["mentor", "/academy"],
    ["academy_admin", "/student/practice"],
    ["academy_admin", "/mentor"],
  ])("sends a %s who opens %s to /forbidden", async (role, path) => {
    fakeSupabase({ id: "u1" }, role);
    const res = await updateSession(request(path));
    const target = redirectTarget(res);
    expect(target?.pathname).toBe("/forbidden");
    expect(target?.search).toBe("");
  });

  it("signs out a logged-in user with no profile row and explains why (not /forbidden)", async () => {
    const { signOut } = fakeSupabase({ id: "u1" }, null);
    const target = redirectTarget(await updateSession(request("/student")));
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("reason")).toBe("profile_missing");
    expect(signOut).toHaveBeenCalled();
  });

  it("treats a failed profile query (e.g. a migration not applied) as an outage, not a permission denial", async () => {
    const { signOut } = fakeSupabase({ id: "u1" }, "student", "active", null, { code: "42703", message: "column profiles.status does not exist" });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const target = redirectTarget(await updateSession(request("/student/practice")));
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("reason")).toBe("account_unavailable");
    expect(target?.searchParams.get("next")).toBe("/student/practice");
    // Kept signed in so a retry works once the database recovers.
    expect(signOut).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalled();
    errorLog.mockRestore();
  });

  it("sends a profile with an unrecognised role to /forbidden", async () => {
    fakeSupabase({ id: "u1" }, "janitor");
    expect(redirectTarget(await updateSession(request("/student")))?.pathname).toBe("/forbidden");
  });

  it("never redirects /login, /reset-password or /auth/callback (no loops)", async () => {
    for (const path of ["/login?reason=account_unavailable", "/reset-password", "/auth/callback", "/forgot-password", "/forbidden"]) {
      const { from } = fakeSupabase({ id: "u1" }, null, "active", null, { code: "42703", message: "x" });
      expect(redirectTarget(await updateSession(request(path)))).toBeNull();
      expect(from).not.toHaveBeenCalled();
    }
  });

  it("ignores a role supplied by the browser in the query string", async () => {
    fakeSupabase({ id: "u1" }, "student");
    const res = await updateSession(request("/academy?role=academy_admin"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });
});

describe("updateSession — /admin (super_admin workspace) and account status", () => {
  it("redirects a logged-out visitor to /login", async () => {
    fakeSupabase(null, null);
    const res = await updateSession(request("/admin/users"));
    const target = redirectTarget(res);
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("next")).toBe("/admin/users");
  });

  it.each(["student", "mentor", "academy_admin"])("sends a %s who opens /admin to /forbidden", async (role) => {
    fakeSupabase({ id: "u1" }, role);
    const res = await updateSession(request("/admin"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });

  it("lets a super admin into /admin and nested pages", async () => {
    for (const path of ["/admin", "/admin/users", "/admin/users/123"]) {
      fakeSupabase({ id: "u1" }, "super_admin");
      expect(redirectTarget(await updateSession(request(path)))).toBeNull();
    }
  });

  it.each(["/student", "/mentor", "/academy"])("keeps a super admin out of another role's workspace (%s)", async (path) => {
    fakeSupabase({ id: "u1" }, "super_admin");
    expect(redirectTarget(await updateSession(request(path)))?.pathname).toBe("/forbidden");
  });

  it("signs out a suspended account and sends it to login with a reason", async () => {
    const { signOut } = fakeSupabase({ id: "u1" }, "student", "suspended");
    const res = await updateSession(request("/student"));
    const target = redirectTarget(res);
    expect(signOut).toHaveBeenCalled();
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("reason")).toBe("account_suspended");
  });

  it("suspends a super admin too", async () => {
    fakeSupabase({ id: "u1" }, "super_admin", "suspended");
    expect(redirectTarget(await updateSession(request("/admin")))?.searchParams.get("reason")).toBe("account_suspended");
  });

  it.each(["student", "mentor", "academy_admin"])("signs out a %s whose academy is suspended", async (role) => {
    const { signOut } = fakeSupabase({ id: "u1" }, role, "active", "suspended");
    const path = role === "student" ? "/student" : role === "mentor" ? "/mentor" : "/academy";
    const target = redirectTarget(await updateSession(request(path)));
    expect(signOut).toHaveBeenCalled();
    expect(target?.searchParams.get("reason")).toBe("academy_suspended");
  });

  it("does not block a super admin because of an academy's status", async () => {
    fakeSupabase({ id: "u1" }, "super_admin", "active", "suspended");
    expect(redirectTarget(await updateSession(request("/admin")))).toBeNull();
  });
});

describe("updateSession — email links that fell back to the Site URL", () => {
  it("forwards /?code=… to /auth/callback with the query intact", async () => {
    fakeSupabase(null, null);
    const target = redirectTarget(await updateSession(request("/?code=abc123")));
    expect(target?.pathname).toBe("/auth/callback");
    expect(target?.searchParams.get("code")).toBe("abc123");
  });

  it("forwards a token_hash link too, and leaves the plain home page alone", async () => {
    fakeSupabase(null, null);
    const target = redirectTarget(await updateSession(request("/?token_hash=th&type=recovery")));
    expect(target?.pathname).toBe("/auth/callback");
    expect(target?.searchParams.get("type")).toBe("recovery");
    expect(redirectTarget(await updateSession(request("/")))).toBeNull();
    expect(redirectTarget(await updateSession(request("/?token_hash=th")))).toBeNull();
  });
});
