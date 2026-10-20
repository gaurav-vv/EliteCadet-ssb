import { BatchPerformance } from "@/components/academy/dashboard/batch-performance";
import { DashboardGreeting } from "@/components/academy/dashboard/dashboard-greeting";
import { DashboardHero } from "@/components/academy/dashboard/dashboard-hero";
import { DashboardKpiGrid } from "@/components/academy/dashboard/dashboard-kpi-grid";
import { QuickActions } from "@/components/academy/dashboard/quick-actions";
import { RecentActivity } from "@/components/academy/dashboard/recent-activity";
import { ScoresByArea } from "@/components/academy/dashboard/scores-by-area";
import { StudentPerformanceChart } from "@/components/academy/dashboard/student-performance-chart";
import { TodayTasks } from "@/components/academy/dashboard/today-tasks";
import { UpcomingSessions } from "@/components/academy/dashboard/upcoming-sessions";
import type { DashboardMetric, DashboardTask } from "@/types/academy";
import type { AcademyDashboard as AcademyDashboardData } from "@/types/dashboards";

interface AcademyDashboardProps {
  data: AcademyDashboardData;
  view: { metrics: DashboardMetric[]; tasks: DashboardTask[] };
  adminFirstName: string;
}

// Layout only: every section receives plain, real data (lib/server/dashboards).
export function AcademyDashboard({ data, view, adminFirstName }: AcademyDashboardProps) {
  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid items-center gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <DashboardGreeting adminFirstName={adminFirstName} academyName={data.academyName} />
        <DashboardHero />
      </div>

      <DashboardKpiGrid metrics={view.metrics} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
        <StudentPerformanceChart data={data.monthlyScores} />
        <ScoresByArea categories={data.categories} />
        <TodayTasks tasks={view.tasks} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <RecentActivity activity={data.recentActivity} />
        <BatchPerformance batches={data.batches} />
        <UpcomingSessions sessions={data.upcomingSessions} />
      </div>

      <QuickActions />
    </div>
  );
}
