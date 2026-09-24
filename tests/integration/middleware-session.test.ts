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

function fakeSupabase(user: { id: string } | null, profileRole: string | null) {
  const single = vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole } : null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  mockedCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  } as unknown as ReturnType<typeof createServerClient>);
  return { from, eq };
}

function request(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

function redirectTarget(res: Response): URL | null {
  const location = res.headers.get("location");
  return location ? new URL(location) : null;
}

beforeEach(() => {
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

  it("sends a logged-in user with no profile row to /forbidden", async () => {
    fakeSupabase({ id: "u1" }, null);
    const res = await updateSession(request("/student"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });

  it("ignores a role supplied by the browser in the query string", async () => {
    fakeSupabase({ id: "u1" }, "student");
    const res = await updateSession(request("/academy?role=academy_admin"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });
});
