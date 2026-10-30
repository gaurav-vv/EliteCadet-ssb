// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  claims: { data: { claims: { sub: "u1", email: "s@x.co" } }, error: null } as unknown,
  profile: { data: { id: "u1", role: "student", full_name: "Sam", academy_id: "a1", status: "active" }, error: null, status: 200 } as unknown,
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => state.claims, getUser: state.getUser },
    from: state.from,
  }),
}));

import { getCurrentUserAndProfile } from "@/lib/auth/session";

beforeEach(() => {
  state.getUser.mockReset();
  state.from.mockReset();
  state.from.mockImplementation(() => ({ select: () => ({ eq: () => ({ maybeSingle: async () => state.profile }) }) }));
  state.claims = { data: { claims: { sub: "u1", email: "s@x.co" } }, error: null };
  state.profile = { data: { id: "u1", role: "student", full_name: "Sam", academy_id: "a1", status: "active" }, error: null, status: 200 };
});

describe("getCurrentUserAndProfile", () => {
  it("returns the verified user and their profile, using one profile query and no getUser()", async () => {
    const r = await getCurrentUserAndProfile();
    expect(r.user).toEqual({ id: "u1", email: "s@x.co" });
    expect(r.profile).toMatchObject({ id: "u1", role: "student", fullName: "Sam", academyId: "a1", status: "active" });
    expect(state.from).toHaveBeenCalledTimes(1);
    expect(state.getUser).not.toHaveBeenCalled();
  });

  it("is signed out, and reads no profile, when the token fails verification", async () => {
    state.claims = { data: null, error: { message: "expired" } };
    expect(await getCurrentUserAndProfile()).toEqual({ user: null, profile: null, profileError: false });
    expect(state.from).not.toHaveBeenCalled();
  });

  it("reports a missing profile row as no profile, not an error", async () => {
    state.profile = { data: null, error: null, status: 200 };
    const r = await getCurrentUserAndProfile();
    expect(r.user?.id).toBe("u1");
    expect(r.profile).toBeNull();
    expect(r.profileError).toBe(false);
  });

  it("flags a failed profile query as an outage", async () => {
    state.profile = { data: null, error: { code: "42703", message: "column does not exist" }, status: 400 };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await getCurrentUserAndProfile();
    expect(r.profileError).toBe(true);
    expect(r.profile).toBeNull();
    log.mockRestore();
  });
});
