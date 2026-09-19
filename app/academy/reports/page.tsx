import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardData, getMentors, getStudents } from "@/lib/api/academy";

export const metadata: Metadata = { title: "Reports" };

const BUCKETS = [
  { label: "0–39", min: 0, max: 39 },
  { label: "40–59", min: 40, max: 59 },
  { label: "60–79", min: 60, max: 79 },
  { label: "80–100", min: 80, max: 100 },
];

export default async function ReportsPage() {
  const [dashboardResult, studentsResult, mentorsResult] = await Promise.all([
    getDashboardData(),
    getStudents(),
    getMentors(),
  ]);

  const dashboard = dashboardResult.data;
  const students = studentsResult.data ?? [];
  const mentors = mentorsResult.data ?? [];

  const scoredStudents = students.filter((s) => s.readiness !== null);
  const distribution = BUCKETS.map((bucket) => ({
    ...bucket,
    count: scoredStudents.filter((s) => (s.readiness ?? -1) >= bucket.min && (s.readiness ?? -1) <= bucket.max).length,
  }));

  const activeCount = students.filter((s) => s.status === "active" && s.lastActivityAt).length;
  const inactiveCount = students.length - activeCount;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Reports</h1>
        <p className="text-sm text-text-muted">Academy-wide numbers, scoped to what you can actually act on.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Readiness distribution</h2>
        {scoredStudents.length === 0 ? (
          <EmptyState title="Not enough data yet" description="No students have a readiness score yet." />
        ) : (
          <div className="glass-surface flex items-end gap-4 px-6 py-6">
            {distribution.map((bucket) => (
              <div key={bucket.label} className="flex flex-col items-center gap-1">
                <div className="w-10 rounded-t-sm bg-brand-navy-300" style={{ height: `${Math.max(bucket.count * 20, 4)}px` }} aria-hidden="true" />
                <span className="text-xs text-text-muted">{bucket.label}</span>
                <span className="text-xs font-medium text-text-primary">{bucket.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Batch performance</h2>
        {dashboard && dashboard.batchPerformance.length > 0 ? (
          <div className="flex flex-col gap-2">
            {dashboard.batchPerformance.map((batch) => (
              <div key={batch.batchId} className="glass-surface flex items-center justify-between px-5 py-3">
                <span className="text-sm text-text-primary">{batch.name}</span>
                <span className="text-xs text-text-muted">
                  {batch.studentCount} students · avg readiness {batch.averageReadiness ?? "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No batches yet" description="Create a batch to see performance here." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Student activity</h2>
        <div className="glass-surface flex flex-col gap-1 px-5 py-4">
          <span className="text-sm text-text-primary">{activeCount} students with recorded activity</span>
          <span className="text-sm text-text-muted">{inactiveCount} students with no recent activity or inactive status</span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Mentor workload</h2>
        {mentors.filter((m) => m.status === "active").length > 0 ? (
          <div className="flex flex-col gap-2">
            {mentors
              .filter((m) => m.status === "active")
              .map((mentor) => (
                <div key={mentor.id} className="glass-surface flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-text-primary">{mentor.fullName}</span>
                  <span className="text-xs text-text-muted">
                    {mentor.sessionsThisWeek} sessions this week · {mentor.pendingEvaluations} pending evaluations
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <EmptyState title="No active mentors yet" description="Invited mentors appear here once they accept." />
        )}
      </section>
    </div>
  );
}
