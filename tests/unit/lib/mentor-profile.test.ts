// @vitest-environment node
// A mentor's profile is saved to the database (not the browser) and checked on the server.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { getMyMentorProfile, saveMyMentorProfile } from "@/lib/server/mentor-profile/service";
import { checkMentorProfileInput, isMentorProfileComplete } from "@/lib/server/mentor-profile/validation";
import { createClient } from "@/lib/supabase/server";

const ME = "22222222-2222-4222-8222-222222222222";
const mentorActor = { id: ME, email: null, profile: { id: ME, role: "mentor" as const, fullName: "M", academyId: null, status: "active" as const } };
const valid = { fullName: "Maj. Rao", phone: "+91 98765 43210", bio: "Ex-GTO.", qualifications: "MA Psychology", specialization: "GTO, Interview, GTO" };

describe("checkMentorProfileInput", () => {
  it("trims, de-duplicates the specializations and turns blanks into null", () => {
    expect(checkMentorProfileInput(valid)).toEqual({ ok: true, values: { fullName: "Maj. Rao", phone: "+91 98765 43210", bio: "Ex-GTO.", qualifications: "MA Psychology", specialization: ["GTO", "Interview"] } });
    expect(checkMentorProfileInput({ fullName: "A B", phone: "  ", bio: "", qualifications: "", specialization: "" })).toEqual({ ok: true, values: { fullName: "A B", phone: null, bio: null, qualifications: null, specialization: [] } });
  });

  it.each([
    [{ ...valid, fullName: "  " }, "fullName"],
    [{ ...valid, fullName: "x".repeat(101) }, "fullName"],
    [{ ...valid, phone: "abc" }, "phone"],
    [{ ...valid, bio: "x".repeat(1001) }, "bio"],
    [{ ...valid, qualifications: "x".repeat(501) }, "qualifications"],
    [{ ...valid, specialization: Array.from({ length: 11 }, (_, i) => `s${i}`).join(",") }, "specialization"],
    [{ ...valid, specialization: "x".repeat(61) }, "specialization"],
  ])("rejects bad input next to the right field (%#)", (input, field) => {
    const result = checkMentorProfileInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe(field);
  });

  it("ignores non-string input instead of throwing", () => {
    expect(checkMentorProfileInput({ fullName: 42 }).ok).toBe(false);
    expect(checkMentorProfileInput({ fullName: "Ok Name", bio: { a: 1 }, specialization: ["x"] })).toMatchObject({ ok: true, values: { bio: null, specialization: [] } });
  });
});

describe("isMentorProfileComplete", () => {
  it("needs bio, qualifications and at least one specialization", () => {
    expect(isMentorProfileComplete({ bio: "b", qualifications: "q", specialization: ["s"] })).toBe(true);
    expect(isMentorProfileComplete({ bio: null, qualifications: "q", specialization: ["s"] })).toBe(false);
    expect(isMentorProfileComplete({ bio: "b", qualifications: null, specialization: ["s"] })).toBe(false);
    expect(isMentorProfileComplete({ bio: "b", qualifications: "q", specialization: [] })).toBe(false);
  });
});

// A tiny chainable stand-in for the supabase query builder: every call returns itself, awaiting it yields `result`.
function builder(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "maybeSingle"]) b[m] = vi.fn(() => b);
  b.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return b;
}
function stub(tables: Record<string, unknown>) {
  const from = vi.fn((t: string) => tables[t]);
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return from;
}

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  vi.mocked(createClient).mockReset();
});

describe("saveMyMentorProfile", () => {
  it("refuses anyone who is not a signed-in mentor, before touching the database", async () => {
    vi.mocked(getActor).mockResolvedValue(null);
    expect((await saveMyMentorProfile(valid)).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue({ ...mentorActor, profile: { ...mentorActor.profile, role: "student" as never } });
    expect((await saveMyMentorProfile(valid)).error?.code).toBe("unauthorized");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("returns the field for a validation error and writes nothing", async () => {
    vi.mocked(getActor).mockResolvedValue(mentorActor);
    const result = await saveMyMentorProfile({ ...valid, phone: "nope" });
    expect(result).toMatchObject({ ok: false, field: "phone" });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("saves to profiles and mentor_profiles, scoped to the caller's own id", async () => {
    vi.mocked(getActor).mockResolvedValue(mentorActor);
    const profiles = builder({ data: [{ id: ME }], error: null });
    const mentorProfiles = builder({ data: [{ user_id: ME }], error: null });
    stub({ profiles, mentor_profiles: mentorProfiles });
    const result = await saveMyMentorProfile(valid);
    expect(result.ok).toBe(true);
    expect((profiles.update as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ full_name: "Maj. Rao", phone: "+91 98765 43210" });
    expect((profiles.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("id", ME);
    expect((mentorProfiles.update as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({ bio: "Ex-GTO.", qualifications: "MA Psychology", expertise: ["GTO", "Interview"] });
    expect((mentorProfiles.eq as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith("user_id", ME);
  });

  it("never reports success when no row was updated (RLS or a missing mentor_profiles row)", async () => {
    vi.mocked(getActor).mockResolvedValue(mentorActor);
    stub({ profiles: builder({ data: [{ id: ME }], error: null }), mentor_profiles: builder({ data: [], error: null }) });
    expect((await saveMyMentorProfile(valid)).ok).toBe(false);
    stub({ profiles: builder({ data: null, error: { code: "42501" } }), mentor_profiles: builder({ data: [{ user_id: ME }], error: null }) });
    expect((await saveMyMentorProfile(valid)).ok).toBe(false);
  });
});

describe("getMyMentorProfile", () => {
  it("reads the saved details for the caller", async () => {
    vi.mocked(getActor).mockResolvedValue(mentorActor);
    stub({
      profiles: builder({ data: { full_name: "Maj. Rao", phone: null }, error: null }),
      mentor_profiles: builder({ data: { bio: "Ex-GTO.", qualifications: null, expertise: ["GTO", 5] }, error: null }),
    });
    expect(await getMyMentorProfile()).toEqual({ ok: true, data: { fullName: "Maj. Rao", phone: null, bio: "Ex-GTO.", qualifications: null, specialization: ["GTO"] } });
  });
});
