import type { Metadata } from "next";
import { AcademyDashboard } from "@/components/academy/dashboard/academy-dashboard";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { buildDashboardViewModel } from "@/lib/academy/dashboard-view";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { getAcademyDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AcademyDashboardPage() {
  const [result, { profile }] = await Promise.all([getAcademyDashboard(new Date().toISOString()), getCurrentUserAndProfile()]);
  if (!result.ok || !result.data) {
    return <RetryErrorState message={result.error?.message ?? "We couldn't load your academy dashboard. Please try again."} />;
  }
  const adminFirstName = profile?.fullName?.trim().split(/\s+/)[0] || "there";
  return <AcademyDashboard data={result.data} view={buildDashboardViewModel(result.data)} adminFirstName={adminFirstName} />;
}
