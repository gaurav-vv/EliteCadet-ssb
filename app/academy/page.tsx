import type { Metadata } from "next";
import { AcademyDashboard } from "@/components/academy/dashboard/academy-dashboard";
import { ErrorState } from "@/components/ui/error-state";
import { getAnalytics, getDashboardData, getMentors, getStudents } from "@/lib/api/academy";
import { getStudentSummary } from "@/lib/api/students";
import { buildDashboardViewModel } from "@/lib/academy/dashboard-view";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AcademyDashboardPage() {
  // Independent reads run in parallel; the page only assembles their results.
  const [result, studentsResult, mentorsResult, analyticsResult, studentSummary, { profile }] = await Promise.all([
    getDashboardData(),
    getStudents(),
    getMentors(),
    getAnalytics(),
    getStudentSummary(),
    getCurrentUserAndProfile(),
  ]);
  if (!result.data || !studentsResult.data || !mentorsResult.data || !analyticsResult.data) {
    return <ErrorState message="We couldn't load your academy dashboard. Please try again." />;
  }

  const academyName = (await getCurrentAcademyName(profile?.academyId ?? null)) || result.data.academyName;
  const data = { ...result.data, academyName };
  // Student totals come from the real academy_students table. If that read fails
  // the cards say so ("—", "Couldn't load") instead of showing in-memory numbers.
  const studentCounts = studentSummary.ok && studentSummary.data ? { total: studentSummary.data.total, active: studentSummary.data.active } : null;
  const view = buildDashboardViewModel(data, studentsResult.data, mentorsResult.data, studentCounts);
  const adminFirstName = profile?.fullName?.trim().split(/\s+/)[0] || "there";

  return <AcademyDashboard data={data} analytics={analyticsResult.data} view={view} adminFirstName={adminFirstName} studentCount={studentCounts?.total ?? null} />;
}
