import { Building2, CalendarRange, FileText } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DataTable } from "@/components/academy/shared/data-table";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { CONTENT_CATEGORIES, type ContentCategory } from "@/types/content";
import type { PlatformAnalytics } from "@/types/analytics";

const pct = (v: number | null) => (v === null ? <span className="text-ink-secondary">—</span> : `${v}%`);
export const WINDOW_LABEL: Record<number, string> = { 30: "Last 30 days", 90: "Last 90 days", 365: "Last 12 months" };
const MONTH = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });

export function AnalyticsView({ d }: { d: PlatformAnalytics }) {
  const window = d.window;
  return (
    <>
      <section aria-labelledby="platform-heading" className="flex flex-col gap-3">
        <h2 id="platform-heading" className="text-[18px] font-semibold text-ink">Platform</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="academy" label="Academies" value={d.totals.academies} delta={d.totals.academies > d.totals.academiesActive ? `${d.totals.academies - d.totals.academiesActive} suspended` : undefined} deltaTone="warning" />
          <StatCard icon="students" label="Students" value={d.totals.students} />
          <StatCard icon="mentors" label="Mentors" value={d.totals.mentors} />
          <StatCard icon="batches" label="Active batches" value={d.totals.batchesActive} />
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <h2 id="activity-heading" className="text-[18px] font-semibold text-ink">{WINDOW_LABEL[window]}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="users" label="New accounts" value={d.totals.newUsers} />
          <StatCard icon="sessions" label="Sessions held" value={d.activity.sessionsHeld} />
          <StatCard icon="evaluations" label="Submissions" value={d.activity.submissions} />
          <StatCard icon="checklist" label="Reviews" value={d.activity.reviews} />
          <StatCard icon="performance" label="Average score" value={d.activity.avgScorePct === null ? "—" : `${d.activity.avgScorePct}%`} />
          <StatCard icon="activities" label="Attendance" value={d.activity.attendancePct === null ? "—" : `${d.activity.attendancePct}%`} />
          <StatCard icon="content" label="Library reads" value={d.activity.libraryCompletions} />
        </div>
      </section>

      <ChartCard title="By Academy" description={`Activity figures cover the ${WINDOW_LABEL[window].toLowerCase()}.`} action={{ label: "Academies", href: "/admin/academies" }}>
        {d.academies.length === 0 ? (
          <EmptyState icon={<Building2 aria-hidden="true" size={22} />} title="No academies yet" description="Create one from Academies." />
        ) : (
          <DataTable
            caption="Activity by academy"
            rows={d.academies}
            getRowKey={(a) => a.id}
            getRowHref={(a) => `/admin/academies/${a.id}`}
            columns={[
              { key: "name", header: "Academy", cell: (a) => a.name },
              { key: "status", header: "Status", cell: (a) => <StatusBadge label={a.status === "active" ? "Active" : "Suspended"} tone={a.status === "active" ? "success" : "danger"} /> },
              { key: "students", header: "Students", cell: (a) => a.students },
              { key: "mentors", header: "Mentors", cell: (a) => a.mentors },
              { key: "sessions", header: "Sessions", cell: (a) => a.sessionsHeld },
              { key: "submissions", header: "Submissions", cell: (a) => a.submissions },
              { key: "score", header: "Avg Score", cell: (a) => pct(a.avgScorePct) },
              { key: "attendance", header: "Attendance", cell: (a) => pct(a.attendancePct) },
            ]}
          />
        )}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="By Month" description="Last six months, IST.">
          {d.monthly.every((m) => m.newUsers + m.submissions + m.reviews === 0) ? (
            <EmptyState icon={<CalendarRange aria-hidden="true" size={22} />} title="No activity yet" description="Accounts, submissions and reviews appear here month by month." />
          ) : (
            <DataTable
              caption="Activity by month"
              rows={d.monthly}
              getRowKey={(m) => m.month}
              columns={[
                { key: "month", header: "Month", cell: (m) => MONTH.format(new Date(`${m.month}-15T00:00:00Z`)) },
                { key: "users", header: "New accounts", cell: (m) => m.newUsers },
                { key: "submissions", header: "Submissions", cell: (m) => m.submissions },
                { key: "reviews", header: "Reviews", cell: (m) => m.reviews },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard title="Published Content" action={{ label: "Content Library", href: "/admin/content" }}>
          {d.content.length === 0 ? (
            <EmptyState icon={<FileText aria-hidden="true" size={22} />} title="Nothing published yet" description="Publish items from the Content Library." />
          ) : (
            <ul className="flex flex-col divide-y divide-hairline">
              {d.content.map((c) => (
                <li key={c.category} className="flex min-h-11 items-center justify-between text-[14px]">
                  <span className="text-ink">{CONTENT_CATEGORIES[c.category as ContentCategory] ?? c.category}</span>
                  <span className="text-ink">{c.published}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}
