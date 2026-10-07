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

function fakeSupabase(user: { id: string } | null, profileRole: string | null, grantAreas: string[] = []) {
  const single = vi.fn().mockResolvedValue({ data: profileRole ? { role: profileRole } : null });
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  // admin_grants is read without .single(): eq() resolves to the rows directly.
  const grantsEq = vi.fn().mockResolvedValue({ data: grantAreas.map((area) => ({ area })) });
  const grantsSelect = vi.fn(() => ({ eq: grantsEq }));
  const from = vi.fn((table: string) => (table === "admin_grants" ? { select: grantsSelect } : { select }));
  mockedCreateClient.mockReturnValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  } as unknown as ReturnType<typeof createServerClient>);
  return { from, eq, grantsEq };
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

describe("updateSession — /admin (admin_grants, independent of profiles.role)", () => {
  it("redirects a logged-out visitor to /login", async () => {
    fakeSupabase(null, null);
    const res = await updateSession(request("/admin/access"));
    const target = redirectTarget(res);
    expect(target?.pathname).toBe("/login");
    expect(target?.searchParams.get("next")).toBe("/admin/access");
  });

  it("sends a signed-in user with no grants to /forbidden, whatever their role", async () => {
    fakeSupabase({ id: "u1" }, "academy_admin", []);
    const res = await updateSession(request("/admin"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });

  it("lets any grant holder into the /admin overview", async () => {
    const { grantsEq } = fakeSupabase({ id: "u1" }, "student", ["mentor_content"]);
    const res = await updateSession(request("/admin"));
    expect(redirectTarget(res)).toBeNull();
    expect(grantsEq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("lets an area editor into their own area only", async () => {
    fakeSupabase({ id: "u1" }, "student", ["student_content"]);
    expect(redirectTarget(await updateSession(request("/admin/student-content")))).toBeNull();

    fakeSupabase({ id: "u1" }, "student", ["student_content"]);
    expect(redirectTarget(await updateSession(request("/admin/mentor-content")))?.pathname).toBe("/forbidden");

    fakeSupabase({ id: "u1" }, "student", ["student_content"]);
    expect(redirectTarget(await updateSession(request("/admin/academy-content/batches")))?.pathname).toBe("/forbidden");
  });

  it("keeps /admin/access (grant management) away from area editors", async () => {
    fakeSupabase({ id: "u1" }, "student", ["student_content", "mentor_content", "academy_content"]);
    const res = await updateSession(request("/admin/access"));
    expect(redirectTarget(res)?.pathname).toBe("/forbidden");
  });

  it("lets a super admin into every area and the access page", async () => {
    for (const path of ["/admin", "/admin/access", "/admin/student-content", "/admin/mentor-content", "/admin/academy-content"]) {
      fakeSupabase({ id: "u1" }, "student", ["super"]);
      expect(redirectTarget(await updateSession(request(path)))).toBeNull();
    }
  });

  it("does not consult profiles.role for /admin", async () => {
    const { eq } = fakeSupabase({ id: "u1" }, null, ["super"]);
    await updateSession(request("/admin"));
    expect(eq).not.toHaveBeenCalled();
  });
});
