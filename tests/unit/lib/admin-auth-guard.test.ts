// @vitest-environment node
// requireAdminArea is the server-side second line of defence behind the
// middleware (AGENTS.md §10): every /admin page, the layout and both actions
// rely on it, so its redirects are asserted directly.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { redirect } from "next/navigation";
import { getAdminGrants, requireAdminArea } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";

const mockedCreateClient = vi.mocked(createClient);

function fakeSupabase(user: { id: string } | null, rows: unknown[] | null) {
  const eq = vi.fn().mockResolvedValue({ data: rows });
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  mockedCreateClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  } as unknown as Awaited<ReturnType<typeof createClient>>);
  return { from, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getAdminGrants", () => {
  it("returns null when nobody is signed in, without querying grants", async () => {
    const { from } = fakeSupabase(null, null);
    expect(await getAdminGrants()).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("reads only the caller's own grants and drops unknown area values", async () => {
    const { from, eq } = fakeSupabase({ id: "u1" }, [{ area: "mentor_content" }, { area: "owner" }, { area: null }]);
    expect(await getAdminGrants()).toEqual({ userId: "u1", grants: ["mentor_content"] });
    expect(from).toHaveBeenCalledWith("admin_grants");
    expect(eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("fails closed (no grants) when the query returns no data", async () => {
    fakeSupabase({ id: "u1" }, null);
    expect(await getAdminGrants()).toEqual({ userId: "u1", grants: [] });
  });
});

describe("requireAdminArea", () => {
  it("redirects a signed-out visitor to /login", async () => {
    fakeSupabase(null, null);
    await expect(requireAdminArea("any")).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects a user without the needed grant to /forbidden", async () => {
    fakeSupabase({ id: "u1" }, [{ area: "student_content" }]);
    await expect(requireAdminArea("mentor_content")).rejects.toThrow("REDIRECT:/forbidden");
    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/forbidden");
  });

  it("redirects a user with no grants away from the overview", async () => {
    fakeSupabase({ id: "u1" }, []);
    await expect(requireAdminArea("any")).rejects.toThrow("REDIRECT:/forbidden");
  });

  it("returns the session when the grant matches, and super passes everything", async () => {
    fakeSupabase({ id: "u1" }, [{ area: "student_content" }]);
    await expect(requireAdminArea("student_content")).resolves.toEqual({ userId: "u1", grants: ["student_content"] });

    fakeSupabase({ id: "u2" }, [{ area: "super" }]);
    await expect(requireAdminArea("academy_content")).resolves.toEqual({ userId: "u2", grants: ["super"] });
  });
});
