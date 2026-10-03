import Link from "next/link";
import { AssessmentRadar } from "@/components/academy/dashboard/assessment-radar";
import { BatchPerformance } from "@/components/academy/dashboard/batch-performance";
import { DashboardGreeting } from "@/components/academy/dashboard/dashboard-greeting";
import { DashboardHero } from "@/components/academy/dashboard/dashboard-hero";
import { DashboardKpiGrid } from "@/components/academy/dashboard/dashboard-kpi-grid";
import { QuickActions } from "@/components/academy/dashboard/quick-actions";
import { RecentActivity } from "@/components/academy/dashboard/recent-activity";
import { StudentPerformanceChart } from "@/components/academy/dashboard/student-performance-chart";
import { TodayTasks } from "@/components/academy/dashboard/today-tasks";
import { UpcomingSessions } from "@/components/academy/dashboard/upcoming-sessions";
import type { AcademyAnalytics, AcademyDashboardData, DashboardViewModel } from "@/types/academy";

interface AcademyDashboardProps {
  data: AcademyDashboardData;
  analytics: AcademyAnalytics;
  view: DashboardViewModel;
  adminFirstName: string;
}

// Layout only: every section is its own component and receives plain data, so
// each can later be fed from a real query (or wrapped in Suspense) on its own.
export function AcademyDashboard({ data, analytics, view, adminFirstName }: AcademyDashboardProps) {
  const isEmpty = data.totalStudents === 0 && data.totalMentors === 0 && data.activeBatches === 0;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <div className="grid items-center gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <DashboardGreeting adminFirstName={adminFirstName} academyName={data.academyName} />
        <DashboardHero />
      </div>

      {isEmpty && (
        <div className="glass-regular flex flex-col gap-1 rounded-card p-5">
          <p className="text-[15px] font-semibold text-ink">Your academy is empty right now</p>
          <p className="text-[14px] text-ink-secondary">
            Add your first student, batch or mentor — or load sample data from{" "}
            <Link href="/academy/settings" className="text-brand-accent underline">
              Settings
            </Link>{" "}
            to preview a populated dashboard.
          </p>
        </div>
      )}

      <DashboardKpiGrid metrics={view.metrics} />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-[1.35fr_1fr_1fr]">
        <StudentPerformanceChart data={analytics.performanceTrend} source={analytics.source} />
        <AssessmentRadar data={analytics.assessmentInsights} source={analytics.source} />
        <TodayTasks tasks={view.tasks} />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <RecentActivity activity={view.activity} />
        <BatchPerformance batches={data.batchPerformance} />
        <UpcomingSessions sessions={analytics.upcomingSessions} source={analytics.source} />
      </div>

      <QuickActions />
    </div>
  );
}
