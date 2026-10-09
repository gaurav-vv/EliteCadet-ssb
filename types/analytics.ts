export type AnalyticsWindow = 30 | 90 | 365;

export interface AcademyAnalyticsRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  students: number;
  mentors: number;
  batches: number;
  sessionsHeld: number;
  submissions: number;
  reviews: number;
  avgScorePct: number | null;
  attendancePct: number | null;
}

export interface PlatformAnalytics {
  window: AnalyticsWindow;
  totals: { academies: number; academiesActive: number; students: number; mentors: number; academyAdmins: number; batchesActive: number; newUsers: number };
  activity: { sessionsHeld: number; submissions: number; reviews: number; avgScorePct: number | null; attendancePct: number | null; libraryCompletions: number };
  academies: AcademyAnalyticsRow[];
  monthly: { month: string; newUsers: number; submissions: number; reviews: number }[];
  content: { category: string; published: number }[];
}
