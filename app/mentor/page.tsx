import type { Metadata } from "next";
import Link from "next/link";
import { CapsuleSecondary } from "@/components/ui/capsule";
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
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome back, {data.mentorName.split(" ")[0]}</h1>
        <p className="text-sm text-text-muted">Here&apos;s who needs your attention today.</p>
      </div>

      {data.totalMentees === 0 && (
        <Alert>
          <AlertDescription>
            You don&apos;t have any mentees yet. Visit{" "}
            <Link href="/mentor/profile" className="underline">
              Profile
            </Link>{" "}
            to load sample demo data and preview what this dashboard looks like once populated.
          </AlertDescription>
        </Alert>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total mentees", value: data.totalMentees },
          { label: "Sessions this week", value: data.sessionsThisWeek },
          { label: "Pending evaluations", value: data.pendingEvaluations },
          { label: "Average mentee score", value: data.averageMenteeScore ?? "—" },
        ].map((stat) => (
          <div key={stat.label} className="glass-surface flex flex-col gap-1 px-5 py-4">
            <span className="text-xs font-medium tracking-wide text-text-muted uppercase">{stat.label}</span>
            <span className="text-2xl font-semibold text-text-primary">{stat.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Students needing attention</h2>
        {data.attentionMentees.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.attentionMentees.map((m) => (
              <li key={m.menteeId}>
                <CapsuleSecondary
                  href={`/mentor/mentees/${m.menteeId}`}
                  icon="mentees"
                  label={m.fullName}
                  description={m.reason}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No attention signals" description="Every mentee has recent, on-track activity." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Today&apos;s schedule</h2>
        {data.todaysSchedule.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.todaysSchedule.map((s) => (
              <li key={s.title}>
                <CapsuleSecondary icon="sessions" label={s.title} description={`With ${s.withName} · ${formatDate(s.scheduledFor)}`} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing scheduled today" description="Create a session from the Sessions tab." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Mentee progress overview</h2>
        {data.menteeProgressOverview.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.menteeProgressOverview.map((row) => (
              <Link
                key={row.menteeId}
                href={`/mentor/mentees/${row.menteeId}`}
                className="glass-surface flex items-center justify-between px-5 py-3 no-underline"
              >
                <span className="text-sm text-text-primary">{row.fullName}</span>
                <span className="flex items-center gap-2 text-sm text-text-muted">
                  {row.score ?? "—"}
                  <span aria-label={`trend ${row.trend}`}>
                    {row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "→"}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No mentee data yet" description="Progress appears once mentees start practicing." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Recent evaluations</h2>
        {data.recentEvaluations.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.recentEvaluations.map((e) => (
              <li key={`${e.menteeName}-${e.createdAt}`} className="glass-surface flex items-center justify-between px-5 py-3">
                <span className="text-sm text-text-primary">
                  {e.menteeName} · {e.activity}
                </span>
                <span className="text-xs text-text-muted">
                  {e.score} · {formatDate(e.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No evaluations yet" description="Submitted evaluations will show up here." />
        )}
      </section>
    </div>
  );
}
