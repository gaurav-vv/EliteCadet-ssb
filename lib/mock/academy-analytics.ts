// MOCK DATA — isolated per AGENTS.md §8. Placeholder analytics for dashboard
// widgets that have no backing table yet. Everything returned here is flagged
// source: "demo" and rendered with a visible "Demo data" badge.
//
// What real data would replace this (see status.md → Blockers/Debt):
//   performanceTrend   ← monthly average of assessment_results.score per test
//                        type (TAT/WAT/SRT vs PPDT/GD), grouped by academy
//   assessmentInsights ← average rubric score per skill across the academy's
//                        evaluations, plus a configured SSB benchmark
//   upcomingSessions   ← a `sessions` table (starts_at, title, batch_id,
//                        mentor_id) filtered to today and the academy

import type { AcademyAnalytics } from "@/types/academy";

export function getMockAnalytics(): AcademyAnalytics {
  return {
    source: "demo",
    performanceTrend: [
      { month: "Apr", overall: 44, tatWatSrt: 26, ppdtGd: 10 },
      { month: "May", overall: 56, tatWatSrt: 38, ppdtGd: 20 },
      { month: "Jun", overall: 64, tatWatSrt: 45, ppdtGd: 28 },
      { month: "Jul", overall: 62, tatWatSrt: 41, ppdtGd: 26 },
      { month: "Aug", overall: 76, tatWatSrt: 49, ppdtGd: 33 },
      { month: "Sep", overall: 82, tatWatSrt: 60, ppdtGd: 40 },
    ],
    assessmentInsights: [
      { skill: "Communication", academyAverage: 78, benchmark: 85 },
      { skill: "Leadership", academyAverage: 72, benchmark: 80 },
      { skill: "Teamwork", academyAverage: 70, benchmark: 78 },
      { skill: "Decision Making", academyAverage: 65, benchmark: 80 },
      { skill: "Confidence", academyAverage: 68, benchmark: 78 },
      { skill: "Initiative", academyAverage: 74, benchmark: 80 },
    ],
    upcomingSessions: [
      { id: "demo-s1", time: "10:00 AM", dayLabel: "Today", title: "Group Discussion Session", batchName: "Batch Alpha", mentorName: "Demo Mentor 1" },
      { id: "demo-s2", time: "2:00 PM", dayLabel: "Today", title: "Personal Interview Practice", batchName: "Batch Bravo", mentorName: "Demo Mentor 2" },
      { id: "demo-s3", time: "4:30 PM", dayLabel: "Today", title: "Psychology Test Discussion", batchName: "Batch Charlie", mentorName: "Demo Mentor 3" },
    ],
  };
}
