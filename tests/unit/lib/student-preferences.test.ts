// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: db.rpc, from: db.from }) }));
vi.mock("@/lib/server/auth/guard", () => ({ getActor: vi.fn() }));

import { getActor } from "@/lib/server/auth/guard";
import { savePreferences, toPreferences, validatePreferences } from "@/lib/server/student/preferences";

const TODAY = "2026-10-19";
const good = { fullName: "Arjun Rao", entryScheme: "cds", targetSsbDate: "2026-12-01", preparationStage: "in_progress", preferredLanguage: "en", dailyStudyMinutes: 60, goals: "Clear SSB" };
const actor = (role: string) => ({ id: "u1", email: null, profile: { id: "u1", role, fullName: "Arjun Rao", academyId: null, status: "active" } });

beforeEach(() => {
  vi.mocked(getActor).mockReset();
  db.rpc.mockReset().mockResolvedValue({ data: null, error: null });
  db.from.mockReset();
});

describe("preferences validation", () => {
  it("accepts a complete form; the target date is optional", () => {
    expect(validatePreferences(good, TODAY)).toMatchObject({ ok: true, value: { entryScheme: "cds", dailyStudyMinutes: 60 } });
    expect(validatePreferences({ ...good, targetSsbDate: "" }, TODAY)).toMatchObject({ ok: true, value: { targetSsbDate: null } });
  });
  it("explains every problem", () => {
    const r = validatePreferences({ fullName: "A", entryScheme: "army", preparationStage: "x", dailyStudyMinutes: 7, targetSsbDate: "2026-10-01", goals: "g".repeat(501) }, TODAY);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["dailyStudyMinutes", "entryScheme", "fullName", "goals", "preparationStage", "targetSsbDate"]);
    expect(validatePreferences({ ...good, targetSsbDate: "2029-01-01" }, TODAY).ok).toBe(false);
  });
  it("reads stored rows defensively", () => {
    expect(toPreferences("S", { entry_scheme: "army", preferred_language: "hi", onboarded_at: "t" })).toMatchObject({ entryScheme: null, preferredLanguage: "hi", onboarded: true });
    expect(toPreferences("S", null).onboarded).toBe(false);
  });
});

describe("saving", () => {
  it("only a student saves, through the database function", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("mentor") as never);
    expect((await savePreferences(good, TODAY)).error?.code).toBe("unauthorized");
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    expect((await savePreferences(good, TODAY)).ok).toBe(true);
    expect(db.rpc).toHaveBeenCalledWith("save_student_preferences", { p_entry_scheme: "cds", p_target_date: "2026-12-01", p_stage: "in_progress", p_language: "en", p_daily_minutes: 60, p_goals: "Clear SSB" });
  });
  it("returns field errors without writing", async () => {
    vi.mocked(getActor).mockResolvedValue(actor("student") as never);
    const r = await savePreferences({ ...good, entryScheme: "" }, TODAY);
    expect(r.fieldErrors?.entryScheme).toBeTruthy();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});
