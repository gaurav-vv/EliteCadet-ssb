import type { Metadata } from "next";
import { CapsulePrimary, CapsuleSecondary } from "@/components/ui/capsule";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getDashboardData } from "@/lib/api/student";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const variant = preview === "active" ? "active" : "empty";

  const [result, { profile }] = await Promise.all([getDashboardData(variant), getCurrentUserAndProfile()]);

  if (!result.ok || !result.data) {
    return (
      <ErrorState message="We couldn't load your dashboard. Please try again." />
    );
  }

  const data = result.data;
  const firstName = (profile?.fullName || data.profile.fullName).split(" ")[0];

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome back, {firstName}</h1>
        {variant === "active" && (
          <p className="text-sm text-text-muted">
            The activity and progress below is sample demo data, not yet your real practice history.
          </p>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-surface flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
            Overall readiness
          </span>
          {data.readiness ? (
            <>
              <span className="text-3xl font-semibold text-text-primary">
                {data.readiness.score}
                <span className="text-base font-normal text-text-muted">/100</span>
              </span>
              <span className="text-xs text-text-muted">{data.readiness.basis}</span>
            </>
          ) : (
            <span className="text-sm text-text-muted">
              Complete a few practices to get your first readiness reading.
            </span>
          )}
        </div>

        <div className="glass-surface flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
            Activity
          </span>
          <span className="text-sm text-text-primary">
            {data.activity.practicesCompleted} practices completed
          </span>
          <span className="text-sm text-text-primary">
            {data.activity.sessionsAttended} sessions attended
          </span>
        </div>
      </section>

      {data.todaysMission && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-muted">Today&apos;s Mission</h2>
          <CapsulePrimary
            href={data.todaysMission.href}
            icon="mission"
            label={data.todaysMission.title}
            description={data.todaysMission.description}
          />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Upcoming session</h2>
        {data.upcomingSession ? (
          <CapsuleSecondary
            icon="mentees"
            label={data.upcomingSession.title}
            description={`With ${data.upcomingSession.withName} · ${formatDate(data.upcomingSession.scheduledFor)}`}
          />
        ) : (
          <EmptyState
            title="No upcoming sessions"
            description="Your mentor hasn't scheduled a session yet."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text-muted">My Progress</h2>
          <a href="/student/progress" className="text-xs text-brand-navy hover:underline">
            View progress
          </a>
        </div>
        {data.progress ? (
          <div className="glass-surface flex flex-col gap-2 px-5 py-4">
            <span className="text-sm text-text-primary">{data.progress.skillArea}</span>
            <div className="flex items-end gap-2">
              {data.progress.trend.map((point) => (
                <div key={point.label} className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 rounded-t-sm bg-brand-navy-300"
                    style={{ height: `${Math.max(point.value, 4)}px` }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-text-muted">{point.label}</span>
                </div>
              ))}
              <span className="sr-only">
                {data.progress.trend.map((p) => `${p.label}: ${p.value}`).join(", ")}
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Not enough data yet"
            description="Complete a few practices to see your progress trend."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Recent activity</h2>
        {data.recentActivity.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.recentActivity.map((item) => (
              <li key={item.id}>
                <CapsuleSecondary
                  icon="psychology"
                  label={item.title}
                  description={`${item.category} · ${formatDate(item.completedAt)}`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No activity yet"
            description="Your completed practices and sessions will show up here."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Recommendations</h2>
        {data.recommendations.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.recommendations.map((rec) => (
              <li key={rec.title}>
                <CapsuleSecondary icon="practice" label={rec.title} description={rec.reason} href={rec.href} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No recommendations yet"
            description="Complete your first practice and we'll suggest what to focus on next."
          />
        )}
      </section>
    </div>
  );
}
