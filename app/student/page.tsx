import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StudentDashboardView } from "@/components/dashboards/student-dashboard-view";
import { PageHeader } from "@/components/ui/page-header";
import { getStudentDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  const result = await getStudentDashboard(new Date().toISOString());
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <RetryErrorState message={result.error?.message ?? "We couldn't load your dashboard. Please try again."} />
      </div>
    );
  }
  return <StudentDashboardView d={result.data} />;
}
