import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDashboardData } from "@/lib/api/mentor";

export const metadata: Metadata = { title: "Dashboard" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function MentorDashboardPage() {
  const result = await getDashboardData();
  if (!result.ok || !result.data) {
    return <ErrorState message="We couldn't load your dashboard. Please try again." />;
  }
  const data = result.data;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title={`Welcome back, ${data.mentorName.split(" ")[0]}`} subtitle="Here's who needs your attention today." />

      {data.totalMentees === 0 && (
        <Alert>
          <AlertDescription>
            You don&apos;t have any mentees yet. Visit{" "}
            <Link href="/mentor/profile" className="text-brand-accent underline">
              Profile
            </Link>{" "}
            to load sample demo data and preview what this dashboard looks like once populated.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="mentees" label="Total mentees" value={data.totalMentees} />
        <StatCard icon="sessions" label="Sessions this week" value={data.sessionsThisWeek} />
        <StatCard icon="evaluations" label="Pending evaluations" value={data.pendingEvaluations} />
        <StatCard icon="reports" label="Average mentee score" value={data.averageMenteeScore ?? "—"} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Students needing attention</h2>
        {data.attentionMentees.length > 0 ? (
          <ListPanel>
            {data.attentionMentees.map((m) => (
              <ListRow key={m.menteeId} href={`/mentor/mentees/${m.menteeId}`}>
                <span className="text-sm text-ink">{m.fullName}</span>
                <span className="text-xs text-ink-secondary">{m.reason}</span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No attention signals" description="Every mentee has recent, on-track activity." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Today&apos;s schedule</h2>
        {data.todaysSchedule.length > 0 ? (
          <ListPanel>
            {data.todaysSchedule.map((s) => (
              <ListRow key={s.title}>
                <span className="text-sm text-ink">{s.title}</span>
                <span className="text-xs text-ink-secondary">
                  With {s.withName} · {formatDate(s.scheduledFor)}
                </span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="Nothing scheduled today" description="Create a session from the Sessions tab." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Mentee progress overview</h2>
        {data.menteeProgressOverview.length > 0 ? (
          <ListPanel>
            {data.menteeProgressOverview.map((row) => (
              <ListRow key={row.menteeId} href={`/mentor/mentees/${row.menteeId}`}>
                <span className="text-sm text-ink">{row.fullName}</span>
                <span className="flex items-center gap-2 text-sm text-ink-secondary">
                  {row.score ?? "—"}
                  <span aria-label={`trend ${row.trend}`}>
                    {row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "→"}
                  </span>
                </span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No mentee data yet" description="Progress appears once mentees start practicing." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Recent evaluations</h2>
        {data.recentEvaluations.length > 0 ? (
          <ListPanel>
            {data.recentEvaluations.map((e) => (
              <ListRow key={`${e.menteeName}-${e.createdAt}`}>
                <span className="text-sm text-ink">
                  {e.menteeName} · {e.activity}
                </span>
                <span className="text-xs text-ink-secondary">
                  {e.score} · {formatDate(e.createdAt)}
                </span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No evaluations yet" description="Submitted evaluations will show up here." />
        )}
      </section>
    </div>
  );
}
