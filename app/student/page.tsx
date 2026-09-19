import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { navIcons } from "@/components/ui/nav-icons";
import { StatCard } from "@/components/ui/stat-card";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
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
    return <ErrorState message="We couldn't load your dashboard. Please try again." />;
  }

  const data = result.data;
  const firstName = (profile?.fullName || data.profile.fullName).split(" ")[0];
  const MissionIcon = navIcons.mission;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">Welcome back, {firstName}</h1>
        {variant === "active" && (
          <p className="mt-1 text-[14px] text-ink-secondary">
            The activity and progress below is sample demo data, not yet your real practice history.
          </p>
        )}
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Overall readiness"
          value={data.readiness ? data.readiness.score : "—"}
          delta={data.readiness ? "/100" : undefined}
        />
        <div className="glass-regular flex flex-col gap-1 rounded-card px-5 py-4">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Activity</span>
          <span className="text-[14px] text-ink">{data.activity.practicesCompleted} practices completed</span>
          <span className="text-[14px] text-ink">{data.activity.sessionsAttended} sessions attended</span>
        </div>
      </section>

      {data.todaysMission && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[18px] font-semibold text-ink">Today&apos;s Mission</h2>
          <Link
            href={data.todaysMission.href}
            className="glass-hover-lift glass-regular flex items-center gap-4 rounded-card px-6 py-5 no-underline"
          >
            <span className="glass-thin flex size-11 shrink-0 items-center justify-center rounded-full text-brand-accent">
              <MissionIcon aria-hidden="true" size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{data.todaysMission.title}</span>
              <span className="block text-[13px] text-ink-secondary">{data.todaysMission.description}</span>
            </span>
            <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-brand-accent" />
          </Link>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Upcoming session</h2>
        {data.upcomingSession ? (
          <ListPanel>
            <ListRow>
              <span className="text-sm text-ink">{data.upcomingSession.title}</span>
              <span className="text-xs text-ink-secondary">
                With {data.upcomingSession.withName} · {formatDate(data.upcomingSession.scheduledFor)}
              </span>
            </ListRow>
          </ListPanel>
        ) : (
          <EmptyState title="No upcoming sessions" description="Your mentor hasn't scheduled a session yet." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-ink">My Progress</h2>
          <Link href="/student/progress" className="text-xs text-brand-accent hover:underline">
            View progress
          </Link>
        </div>
        {data.progress ? (
          <div className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
            <span className="text-sm text-ink">{data.progress.skillArea}</span>
            <div className="flex items-end gap-2">
              {data.progress.trend.map((point) => (
                <div key={point.label} className="flex flex-col items-center gap-1">
                  <div
                    className="w-6 rounded-t-sm bg-brand-accent/40"
                    style={{ height: `${Math.max(point.value, 4)}px` }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-ink-secondary">{point.label}</span>
                </div>
              ))}
              <span className="sr-only">{data.progress.trend.map((p) => `${p.label}: ${p.value}`).join(", ")}</span>
            </div>
          </div>
        ) : (
          <EmptyState title="Not enough data yet" description="Complete a few practices to see your progress trend." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Recent activity</h2>
        {data.recentActivity.length > 0 ? (
          <ListPanel>
            {data.recentActivity.map((item) => (
              <ListRow key={item.id}>
                <span className="text-sm text-ink">{item.title}</span>
                <span className="text-xs text-ink-secondary">
                  {item.category} · {formatDate(item.completedAt)}
                </span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No activity yet" description="Your completed practices and sessions will show up here." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Recommendations</h2>
        {data.recommendations.length > 0 ? (
          <ListPanel>
            {data.recommendations.map((rec) => (
              <ListRow key={rec.title} href={rec.href}>
                <span className="text-sm text-ink">{rec.title}</span>
                <span className="max-w-[60%] text-right text-xs text-ink-secondary">{rec.reason}</span>
              </ListRow>
            ))}
          </ListPanel>
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
