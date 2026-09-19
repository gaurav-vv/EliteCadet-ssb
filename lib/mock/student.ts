// MOCK DATA — isolated per AGENTS.md §8. Shaped exactly like the eventual API
// response (types/student.ts) so lib/api/student.ts can swap this out for a
// real fetch call without any component changing. Must never ship as the
// data source in production — tracked in status.md → Technical Debt until
// the real backend (post T013/T014) replaces it.

import type { Recommendation, StudentDashboardData, StudentProfile } from "@/types/student";

const MOCK_ZERO_ACTIVITY_PROFILE: StudentProfile = {
  fullName: "Aditya Rao",
  targetExam: "cds",
  preparationStage: "just_starting",
  academyName: null,
  goals: "Clear the SSB interview stage on my first attempt.",
  onboardedAt: new Date().toISOString(),
};

const MOCK_ACTIVE_PROFILE: StudentProfile = {
  fullName: "Aditya Rao",
  targetExam: "cds",
  preparationStage: "in_progress",
  academyName: "Horizon SSB Academy",
  goals: "Clear the SSB interview stage on my first attempt.",
  onboardedAt: "2026-08-20T09:00:00.000Z",
};

const MOCK_RECOMMENDATIONS: Recommendation[] = [
  {
    title: "Practice a WAT set",
    reason: "Your last 3 WAT responses were reactive rather than constructive — a fresh set builds that habit.",
    href: "/student/practice/psychology/wat",
  },
  {
    title: "Attempt a fresh SRT sheet",
    reason: "SRT is your least-practiced test so far — more reps will make the pattern familiar.",
    href: "/student/practice/psychology/srt",
  },
];

export function getMockDashboardData(variant: "empty" | "active"): StudentDashboardData {
  if (variant === "active") {
    return {
      profile: MOCK_ACTIVE_PROFILE,
      readiness: { score: 62, basis: "Derived from 14 completed practices and 2 mentor evaluations." },
      activity: { practicesCompleted: 14, sessionsAttended: 2 },
      todaysMission: {
        title: "Complete a TAT set",
        description: "One picture-story set, ~25 minutes, to keep your narrative pace consistent.",
        href: "/student/practice/psychology/tat",
      },
      upcomingSession: {
        title: "Mock Interview Review",
        withName: "Mentor Kavita Sharma",
        scheduledFor: "2026-09-22T10:30:00.000Z",
      },
      progress: {
        skillArea: "Psychology tests",
        trend: [
          { label: "Wk 1", value: 40 },
          { label: "Wk 2", value: 48 },
          { label: "Wk 3", value: 55 },
          { label: "Wk 4", value: 62 },
        ],
      },
      recentActivity: [
        { id: "act-1", title: "TAT Set 4", category: "Psychology", completedAt: "2026-09-16T08:20:00.000Z" },
        { id: "act-2", title: "WAT Set 6", category: "Psychology", completedAt: "2026-09-14T08:05:00.000Z" },
        { id: "act-3", title: "SDT Response", category: "Psychology", completedAt: "2026-09-11T08:40:00.000Z" },
      ],
      recommendations: MOCK_RECOMMENDATIONS,
    };
  }

  return {
    profile: MOCK_ZERO_ACTIVITY_PROFILE,
    readiness: null,
    activity: { practicesCompleted: 0, sessionsAttended: 0 },
    todaysMission: {
      title: "Complete your first TAT set",
      description: "A short picture-story exercise to get a baseline reading on your narrative style.",
      href: "/student/practice/psychology/tat",
    },
    upcomingSession: null,
    progress: null,
    recentActivity: [],
    recommendations: [],
  };
}
