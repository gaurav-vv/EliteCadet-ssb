import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StudentDashboardView } from "@/components/dashboards/student-dashboard-view";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardNews } from "@/lib/api/news";
import { getStudentDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  // News never throws: a failing source is skipped (lib/api/news.ts).
  const [result, news] = await Promise.all([
    getStudentDashboard(new Date().toISOString()),
    getDashboardNews(),
  ]);
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <RetryErrorState
          message={
            result.error?.message ??
            "We couldn't load your dashboard. Please try again."
          }
        />
      </div>
    );
  }
  return <StudentDashboardView d={result.data} news={news} />;
}
