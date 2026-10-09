import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, History, ListChecks } from "lucide-react";
import { ProgressStats } from "@/components/progress/progress-views";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { LatestNewsPanel } from "@/components/student/latest-news-panel";
import { NewsTicker } from "@/components/student/news-ticker";
import { formatIstDay, formatIstTimeRange } from "@/lib/server/sessions/validation";
import type { DashboardNews } from "@/lib/api/news";
import type { StudentDashboard } from "@/types/dashboards";

function Section({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="text-[18px] font-semibold text-ink">{title}</h2>
        {link && <Link href={link.href} className="inline-flex min-h-11 items-center text-[13px] text-brand-accent hover:underline">{link.label}</Link>}
      </div>
      {children}
    </section>
  );
}

// Real data only (specs.md §8a.4e): no readiness score and no practice streak
// until those have a defined, stored source (status.md Decisions, T088).
// Defence/SSB news (#7): the Important News ticker on top and the Latest
// Articles panel beside the dashboard on wide screens.

export function StudentDashboardView({ d, news }: { d: StudentDashboard; news?: DashboardNews }) {
  return (
    <div className="flex flex-col gap-6 pb-10">
      {news && <NewsTicker articles={news.importantUpdates} />}
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <div>
            <h1 className="flex items-center gap-2 text-[28px] leading-tight font-bold text-ink sm:text-[32px]">
              Welcome back, {d.firstName}
              <Image src="/images/student-dashboard/waving-hand.jpg" alt="" width={32} height={32} className="size-8 shrink-0 object-contain mix-blend-multiply" />
            </h1>
            <p className="mt-1 text-[14px] text-ink-secondary sm:text-[15px]">Your next steps and progress, from your mentor&apos;s reviews and your sessions.</p>
          </div>
      <ProgressStats summary={d.summary} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Do next">
          {d.recommendations.length === 0 ? (
            <div className="glass-regular rounded-card"><EmptyState icon={<ListChecks aria-hidden="true" size={22} />} title="Nothing waiting on you" description="New assessments and sessions from your mentor appear here." /></div>
          ) : (
            <ListPanel>
              {d.recommendations.map((r) => (
                <ListRow key={r.href + r.title} href={r.href}>
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{r.title}</span>
                    <span className="block text-[13px] text-ink-secondary">{r.reason}</span>
                  </span>
                  <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
                </ListRow>
              ))}
            </ListPanel>
          )}
        </Section>

        <Section title="Next session" link={{ href: "/student/sessions", label: "All sessions" }}>
          {d.nextSession ? (
            <ListPanel>
              <ListRow href="/student/sessions">
                <span className="min-w-0">
                  <span className="block text-sm text-ink">{d.nextSession.title}</span>
                  <span className="block text-[13px] text-ink-secondary">
                    {formatIstDay(d.nextSession.startsAt)} · {formatIstTimeRange(d.nextSession.startsAt, d.nextSession.endsAt)}
                    {d.nextSession.mentorName ? ` · ${d.nextSession.mentorName}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] text-ink">{d.nextSession.mode === "online" ? "Online" : "In person"}</span>
              </ListRow>
            </ListPanel>
          ) : (
            <div className="glass-regular rounded-card"><EmptyState icon={<CalendarClock aria-hidden="true" size={22} />} title="No upcoming sessions" description="Your mentor hasn't scheduled one yet." /></div>
          )}
        </Section>
      </div>

      <Section title="Recent activity" link={{ href: "/student/progress", label: "View progress" }}>
        {d.recentActivity.length === 0 ? (
          <div className="glass-regular rounded-card"><EmptyState icon={<History aria-hidden="true" size={22} />} title="No activity yet" description="Submitted assessments and mentor feedback show up here." /></div>
        ) : (
          <ListPanel>
            {d.recentActivity.map((a) => (
              <ListRow key={a.id} href={a.href}>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{a.title}</span>
                  <span className="block text-[13px] text-ink-secondary">{a.detail}</span>
                </span>
                <span className="shrink-0 text-[13px] text-ink-secondary">{formatIstDay(a.at)}</span>
              </ListRow>
            ))}
          </ListPanel>
        )}
      </Section>
        </div>
        {news && <LatestNewsPanel articles={news.latestArticles} />}
      </div>
    </div>
  );
}
