import Link from "next/link";
import { CalendarClock, CircleCheck, ClipboardCheck, Users } from "lucide-react";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatIstDay, formatIstTimeRange } from "@/lib/server/sessions/validation";
import type { MenteeRow, MentorDashboard } from "@/types/dashboards";

const TREND: Record<NonNullable<MenteeRow["trend"]>, string> = { up: "Improving", down: "Dropping", flat: "Steady" };

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

const panel = (node: React.ReactNode) => <div className="glass-regular rounded-card">{node}</div>;

// Only this mentor's batches (specs.md §8a.4e); every list links to where the
// mentor acts on it.

export function MentorDashboardView({ d }: { d: MentorDashboard }) {

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title={`Welcome back, ${d.firstName}`} subtitle="Reviews waiting, today's sessions and who needs a look." />

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="mentees" label="Mentees" value={d.menteeCount} />
        <StatCard icon="sessions" label="Sessions, next 7 days" value={d.sessionsNext7Days} />
        <StatCard icon="evaluations" label="Waiting for review" value={d.pendingReviews} />
        <StatCard icon="performance" label="Average score" value={d.avgScorePct === null ? "—" : `${d.avgScorePct}%`} />
      </section>

      {d.menteeCount === 0 &&
        panel(<EmptyState icon={<Users aria-hidden="true" size={22} />} title="You're not on a batch yet" description="Your academy admin assigns mentors to batches; those students appear here." />)}

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Waiting for review" link={{ href: "/mentor/evaluations", label: "All evaluations" }}>
          {d.reviewQueue.length === 0 ? (
            panel(<EmptyState icon={<ClipboardCheck aria-hidden="true" size={22} />} title="Nothing to review" description="Submitted assessments from your batches appear here." />)
          ) : (
            <ListPanel>
              {d.reviewQueue.map((t) => (
                <ListRow key={t.attemptId} href={`/mentor/evaluations/${t.attemptId}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{t.studentName}</span>
                    <span className="block truncate text-[13px] text-ink-secondary">{t.assessmentTitle}</span>
                  </span>
                  <span className="shrink-0 text-[13px] text-ink-secondary">{t.submittedAt ? formatIstDay(t.submittedAt) : ""}</span>
                </ListRow>
              ))}
            </ListPanel>
          )}
        </Section>

        <Section title="Today's sessions" link={{ href: "/mentor/sessions", label: "All sessions" }}>
          {d.todaysSessions.length === 0 ? (
            panel(<EmptyState icon={<CalendarClock aria-hidden="true" size={22} />} title="Nothing scheduled today" description="Schedule one from Sessions." />)
          ) : (
            <ListPanel>
              {d.todaysSessions.map((s) => (
                <ListRow key={s.id} href={`/mentor/sessions/${s.id}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{s.title}</span>
                    <span className="block text-[13px] text-ink-secondary">{s.batchName ?? "Batch"}</span>
                  </span>
                  <span className="shrink-0 text-[13px] text-ink">{formatIstTimeRange(s.startsAt, s.endsAt)}</span>
                </ListRow>
              ))}
            </ListPanel>
          )}
        </Section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="Needs attention">
          {d.attention.length === 0 ? (
            panel(<EmptyState icon={<CircleCheck aria-hidden="true" size={22} />} title="No one is flagged" description="Low scores, missed submissions and low attendance show up here." />)
          ) : (
            <ListPanel>
              {d.attention.map((a) => (
                <ListRow key={a.studentId} href={`/mentor/mentees/${a.studentId}`}>
                  <span className="min-w-0 truncate text-sm text-ink">{a.name}</span>
                  <StatusBadge label={a.reason} tone="warning" className="whitespace-normal" />
                </ListRow>
              ))}
            </ListPanel>
          )}
        </Section>

        <Section title="Mentees by score" link={{ href: "/mentor/mentees", label: "All mentees" }}>
          {d.mentees.length === 0 ? (
            panel(<EmptyState icon={<Users aria-hidden="true" size={22} />} title="No mentees yet" description="Students in your batches appear here." />)
          ) : (
            <ListPanel>
              {d.mentees.map((m) => (
                <ListRow key={m.studentId} href={`/mentor/mentees/${m.studentId}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{m.name}</span>
                    <span className="block text-[13px] text-ink-secondary">{m.batchName ?? "No batch"}</span>
                  </span>
                  <span className="shrink-0 text-right text-[13px]">
                    <span className="block text-ink">{m.avgScorePct === null ? "No reviews" : `${m.avgScorePct}% avg`}</span>
                    {m.trend && <span className="block text-ink-secondary">{TREND[m.trend]} · last {m.lastScorePct}%</span>}
                  </span>
                </ListRow>
              ))}
            </ListPanel>
          )}
        </Section>
      </div>
    </div>
  );
}
