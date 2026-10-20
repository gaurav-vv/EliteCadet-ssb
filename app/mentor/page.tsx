import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MentorDashboardView } from "@/components/dashboards/mentor-dashboard-view";
import { PageHeader } from "@/components/ui/page-header";
import { getMentorDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function MentorDashboardPage() {
  const result = await getMentorDashboard(new Date().toISOString());
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <RetryErrorState message={result.error?.message ?? "We couldn't load your dashboard. Please try again."} />
      </div>
    );
  }
  return <MentorDashboardView d={result.data} />;
}
