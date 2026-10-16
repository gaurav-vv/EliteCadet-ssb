// @vitest-environment node
// The journey structure (lib/practice/journey.ts) against the banks seeded
// by supabase/migrations/0014_practice.sql — catches a module pointing at a
// bank that doesn't exist, and checks the progress/mission rules.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllModules, getModuleDetail, getModulesForDay, getPracticeBankModules, SSB_DAYS } from "@/lib/practice/journey";
import { buildJourneyProgress } from "@/lib/server/practice/journey-progress";

const SQL = readFileSync(path.resolve(__dirname, "../../../supabase/migrations/0014_practice.sql"), "utf8");
const seededSlugs = new Set([...SQL.matchAll(/^\s+\('([a-z0-9-]+)', '[^']+', '(?:response|mcq)'\)/gm)].map((m) => m[1]));

describe("journey structure", () => {
  it("has days 1 to 5, each with uniquely-id'd modules", () => {
    expect(SSB_DAYS.map((d) => d.dayNumber)).toEqual([1, 2, 3, 4, 5]);
    for (const d of SSB_DAYS) {
      const ids = getModulesForDay(d.id).map((m) => m.id);
      expect(ids.length, d.id).toBeGreaterThan(0);
      expect(new Set(ids).size, d.id).toBe(ids.length);
    }
  });

  it("every bank module names a bank seeded by 0014, with the matching kind", () => {
    expect(seededSlugs.size).toBe(11);
    for (const m of getAllModules().filter((x) => x.kind === "bank")) {
      expect(m.bank?.slug, m.id).toBeDefined();
      expect(seededSlugs.has(m.bank!.slug), `${m.id} -> ${m.bank!.slug}`).toBe(true);
      expect(SQL, m.bank!.slug).toContain(`('${m.bank!.slug}', `);
    }
  });

  it("every reading/info module has its copy; the mock conference links out", () => {
    for (const m of getAllModules()) {
      if (m.kind === "reading") expect(m.reading?.body, m.id).toBeTruthy();
      if (m.kind === "info") expect(m.info?.tips.length, m.id).toBeGreaterThan(0);
    }
    expect(getModuleDetail("day-5", "mock-conference")?.href).toBe("/student/practice/conference/mock");
  });

  it("progress is measured on self-paced banks only", () => {
    expect(getPracticeBankModules().every((m) => m.bank.mode === "practice")).toBe(true);
  });
});

describe("journey progress", () => {
  it("sums per day and overall, and points the mission at the first unfinished bank", () => {
    const p = buildJourneyProgress({ "oir-verbal-practice": { done: 15, total: 15 }, "oir-nonverbal-practice": { done: 2, total: 10 }, wat: { done: 0, total: 60 } });
    expect(p.days[0]).toMatchObject({ dayId: "day-1", done: 17, total: 25 });
    expect(p.overall).toEqual({ done: 17, total: 85 });
    expect(p.mission).toEqual({ dayNumber: 1, title: "OIR Non-verbal Practice", href: "/student/practice/day-1/oir-nonverbal-practice", done: 2, total: 10 });
  });

  it("all done, or nothing to do", () => {
    expect(buildJourneyProgress({ "oir-verbal-practice": { done: 1, total: 1 } }).mission).toBe("all-done");
    expect(buildJourneyProgress({}).mission).toBeNull();
  });
});
