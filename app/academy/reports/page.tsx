import type { Metadata } from "next";
import { BarChart3, UserCog } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DataTable } from "@/components/academy/shared/data-table";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { CategoryBars } from "@/components/progress/progress-views";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getAcademyDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Reports" };

// Same data as the dashboard (lib/server/dashboards), laid out for review.
// Charts only where real points exist; otherwise the shared empty state.
export default async function ReportsPage() {
  const result = await getAcademyDashboard(new Date().toISOString());
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Reports" />
        <RetryErrorState message={result.error?.message ?? "We couldn't load reports. Please try again."} />
      </div>
    );
  }
  const d = result.data;
  const scored = d.scoreBuckets.reduce((s, b) => s + b.count, 0);
  const maxBucket = Math.max(1, ...d.scoreBuckets.map((b) => b.count));

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title="Reports" subtitle="Academy-wide numbers from reviewed assessments, marked attendance and submissions." />

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="students" label="Students" value={d.totalStudents} />
        <StatCard icon="activities" label="Submitted, last 14 days" value={d.activeStudents14Days} />
        <StatCard icon="performance" label="Average score" value={d.summary.avgScorePct === null ? "—" : `${d.summary.avgScorePct}%`} />
        <StatCard icon="sessions" label="Attendance" value={d.summary.attendancePct === null ? "—" : `${d.summary.attendancePct}%`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Students by Average Score" description={scored === 0 ? undefined : `${scored} of ${d.totalStudents} students have a reviewed score.`}>
          {scored === 0 ? (
            <EmptyState icon={<BarChart3 aria-hidden="true" size={22} />} title="Not enough data yet" description="No student has a reviewed assessment yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {d.scoreBuckets.map((b) => (
                <li key={b.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[13px]">
                  <span className="text-ink">{b.label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--hairline)]" aria-hidden="true">
                    <span className="block h-full rounded-full bg-[var(--academy-chart-overall)]" style={{ width: `${(b.count / maxBucket) * 100}%` }} />
                  </span>
                  <span className="text-right text-ink">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Scores by Area">
          {d.categories.length === 0 ? (
            <EmptyState icon={<BarChart3 aria-hidden="true" size={22} />} title="Not enough data yet" description="Averages appear once mentors review assessments." />
          ) : (
            <CategoryBars categories={d.categories} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Mentor Workload" action={{ label: "Mentors", href: "/academy/mentors" }}>
        {d.mentors.length === 0 ? (
          <EmptyState icon={<UserCog aria-hidden="true" size={22} />} title="No mentors yet" description="Invite a mentor from Mentors." />
        ) : (
          <DataTable
            caption="Mentor workload"
            rows={d.mentors}
            getRowKey={(m) => m.mentorId}
            columns={[
              { key: "name", header: "Mentor", cell: (m) => m.name },
              { key: "status", header: "Status", cell: (m) => <StatusBadge label={m.invited ? "Invite pending" : "Active"} tone={m.invited ? "warning" : "success"} /> },
              { key: "batches", header: "Batches", cell: (m) => m.batches },
              { key: "sessions", header: "Sessions, next 7 days", cell: (m) => m.sessionsNext7Days },
              { key: "reviews", header: "Waiting for review", cell: (m) => m.pendingReviews },
            ]}
          />
        )}
      </ChartCard>
    </div>
  );
}
