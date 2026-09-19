// MOCK DATA — isolated per AGENTS.md §8. See lib/mock/student.ts for the
// same rationale; this file backs lib/api/progress.ts (T036) until a real
// backend supplies these numbers from actual submissions and evaluations.

import type { StudentProgressData } from "@/types/progress";

export function getMockProgressData(variant: "empty" | "active"): StudentProgressData {
  if (variant === "active") {
    return {
      readiness: { score: 62, basis: "Derived from 14 completed practices and 2 mentor evaluations." },
      skillAreas: [
        { skillArea: "TAT", score: 58, basis: "4 stories completed" },
        { skillArea: "WAT", score: 65, basis: "3 sets completed" },
        { skillArea: "SRT", score: 60, basis: "2 sets completed" },
        { skillArea: "SDT", score: 70, basis: "1 set completed" },
      ],
      activityHistory: [
        { id: "act-1", title: "TAT Set 4", category: "Psychology", completedAt: "2026-09-16T08:20:00.000Z" },
        { id: "act-2", title: "WAT Set 6", category: "Psychology", completedAt: "2026-09-14T08:05:00.000Z" },
        { id: "act-3", title: "SDT Response", category: "Psychology", completedAt: "2026-09-11T08:40:00.000Z" },
        { id: "act-4", title: "SRT Set 2", category: "Psychology", completedAt: "2026-09-08T08:15:00.000Z" },
        { id: "act-5", title: "TAT Set 3", category: "Psychology", completedAt: "2026-09-05T08:20:00.000Z" },
      ],
      improvementAreas: [
        {
          title: "SRT reaction speed",
          reason: "Your SRT responses average fewer words per situation than your other tests — practice concise, decisive reactions.",
        },
        {
          title: "TAT story structure",
          reason: "Recent TAT stories skip a clear resolution — aim to close each story with an outcome.",
        },
      ],
      trend: [
        { label: "Wk 1", value: 40 },
        { label: "Wk 2", value: 48 },
        { label: "Wk 3", value: 55 },
        { label: "Wk 4", value: 62 },
      ],
    };
  }

  return {
    readiness: null,
    skillAreas: [],
    activityHistory: [],
    improvementAreas: [],
    trend: null,
  };
}
