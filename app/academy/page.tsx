import type { Metadata } from "next";
import { AcademyDashboard } from "@/components/academy/dashboard/academy-dashboard";
import { ErrorState } from "@/components/ui/error-state";
import { getAnalytics, getDashboardData, getMentors, getStudents } from "@/lib/api/academy";
import { buildDashboardViewModel } from "@/lib/academy/dashboard-view";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AcademyDashboardPage() {
  // Independent reads run in parallel; the page only assembles their results.
  const [result, studentsResult, mentorsResult, analyticsResult, { profile }] = await Promise.all([
    getDashboardData(),
    getStudents(),
    getMentors(),
    getAnalytics(),
    getCurrentUserAndProfile(),
  ]);
  if (!result.data || !studentsResult.data || !mentorsResult.data || !analyticsResult.data) {
    return <ErrorState message="We couldn't load your academy dashboard. Please try again." />;
  }

  const academyName = (await getCurrentAcademyName(profile?.academyId ?? null)) || result.data.academyName;
  const data = { ...result.data, academyName };
  const view = buildDashboardViewModel(data, studentsResult.data, mentorsResult.data);
  const adminFirstName = profile?.fullName?.trim().split(/\s+/)[0] || "there";

  return <AcademyDashboard data={data} analytics={analyticsResult.data} view={view} adminFirstName={adminFirstName} />;
}
