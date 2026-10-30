import type { Metadata } from "next";
import { Suspense } from "react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { DashboardNewsPanel, DashboardNewsPanelFallback, DashboardNewsTicker } from "@/components/dashboards/dashboard-news";
import { StudentDashboardView } from "@/components/dashboards/student-dashboard-view";
import { PageHeader } from "@/components/ui/page-header";
import { getDashboardNews } from "@/lib/api/news";
import { getStudentDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboardPage() {
  // News comes from external sites and never throws (a failing source is
  // skipped, lib/api/news.ts). Start it now but don't wait for it: it streams in
  // below while the dashboard's own data renders first.
  const news = getDashboardNews();
  const result = await getStudentDashboard(new Date().toISOString());
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
  return (
    <StudentDashboardView
      d={result.data}
      newsTicker={
        <Suspense fallback={null}>
          <DashboardNewsTicker news={news} />
        </Suspense>
      }
      newsPanel={
        <Suspense fallback={<DashboardNewsPanelFallback />}>
          <DashboardNewsPanel news={news} />
        </Suspense>
      }
    />
  );
}
