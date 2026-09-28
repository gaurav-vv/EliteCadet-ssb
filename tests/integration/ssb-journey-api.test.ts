// Integration: lib/api/ssb-journey.ts against the real 5-Day Journey content
// in lib/mock/ssb-journey.ts — catches broken module wiring (missing items,
// duplicate ids, test banks leaking into progress totals).
import { describe, expect, it } from "vitest";
import {
  getAllBankModuleItemIds,
  getContinueCandidates,
  getDayModules,
  getDays,
  getSsbModuleDetail,
  submitSsbBankTest,
} from "@/lib/api/ssb-journey";
import type { SsbDayId } from "@/types/ssb-journey";

describe("5-Day SSB Journey API", () => {
  it("returns days 1 to 5 in order", async () => {
    const { ok, data } = await getDays();
    expect(ok).toBe(true);
    expect(data?.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("every day has modules, and each module resolves to its detail", async () => {
    const { data: days } = await getDays();
    for (const day of days ?? []) {
      const modules = await getDayModules(day.id);
      expect(modules.ok, day.id).toBe(true);
      expect(modules.data?.length, day.id).toBeGreaterThan(0);
      for (const mod of modules.data ?? []) {
        const detail = await getSsbModuleDetail(day.id, mod.id);
        expect(detail.ok, `${day.id}/${mod.id}`).toBe(true);
        expect(detail.data?.dayId).toBe(day.id);
      }
    }
  });

  it("module ids are unique within each day", async () => {
    const { data: days } = await getDays();
    for (const day of days ?? []) {
      const ids = (await getDayModules(day.id)).data?.map((m) => m.id) ?? [];
      expect(new Set(ids).size, day.id).toBe(ids.length);
    }
  });

  it("every bank module has content, and every module kind has what it needs to render", async () => {
    const { data: days } = await getDays();
    for (const day of days ?? []) {
      for (const mod of (await getDayModules(day.id)).data ?? []) {
        const { data: detail } = await getSsbModuleDetail(day.id, mod.id);
        const label = `${day.id}/${mod.id}`;
        if (detail?.kind === "bank") {
          expect((detail.mcqItems ?? detail.responseItems ?? []).length, label).toBeGreaterThan(0);
        }
        if (detail?.kind === "reading") expect(detail.reading?.body, label).toBeTruthy();
        if (detail?.kind === "info") expect(detail.info?.tips.length, label).toBeGreaterThan(0);
      }
    }
  });

  it("every MCQ's correct answer is one of its own options", async () => {
    const { data: days } = await getDays();
    for (const day of days ?? []) {
      for (const mod of (await getDayModules(day.id)).data ?? []) {
        const { data: detail } = await getSsbModuleDetail(day.id, mod.id);
        for (const q of detail?.mcqItems ?? []) {
          expect(q.options.map((o) => o.id), q.id).toContain(q.correctOptionId);
        }
      }
    }
  });

  it("progress totals include practice banks only, never timed tests", async () => {
    const entries = getAllBankModuleItemIds();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const { data } = await getSsbModuleDetail(entry.dayId, entry.moduleId);
      expect(data?.bank?.mode, entry.moduleId).toBe("practice");
    }
  });

  it("continue candidates all link somewhere under /student/practice", () => {
    for (const c of getContinueCandidates()) {
      expect(c.href.startsWith("/student/practice/"), c.moduleId).toBe(true);
      expect(c.itemIds.length, c.moduleId).toBeGreaterThan(0);
    }
  });

  it("returns a friendly error for an unknown day or module", async () => {
    expect((await getDayModules("day-9" as SsbDayId)).ok).toBe(false);
    const missing = await getSsbModuleDetail("day-1", "no-such-module");
    expect(missing.ok).toBe(false);
    expect(missing.error?.message).toBe("That practice module doesn't exist.");
  });

  it("rejects an empty test submission and de-duplicates a repeated one", async () => {
    expect((await submitSsbBankTest({}, "journey-empty")).ok).toBe(false);
    const first = await submitSsbBankTest({ "oir-t-1": "oir-t-1-a" }, "journey-repeat");
    const second = await submitSsbBankTest({ "oir-t-1": "oir-t-1-b" }, "journey-repeat");
    expect(second.data).toEqual(first.data);
  });
});
