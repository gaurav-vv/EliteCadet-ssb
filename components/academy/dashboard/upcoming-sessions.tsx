import { CalendarClock } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DemoBadge } from "@/components/academy/shared/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsSource, UpcomingSession } from "@/types/academy";

interface UpcomingSessionsProps {
  sessions: UpcomingSession[];
  source: AnalyticsSource;
}

export function UpcomingSessions({ sessions, source }: UpcomingSessionsProps) {
  return (
    <ChartCard
      title="Upcoming Sessions"
      badge={source === "demo" ? <DemoBadge /> : undefined}
      className="md:col-span-2 xl:col-span-1"
    >
      {sessions.length === 0 ? (
        <EmptyState
          icon={<CalendarClock aria-hidden="true" size={22} />}
          title="No sessions today"
          description="Scheduled mentor sessions appear here."
        />
      ) : (
        <ol className="flex flex-col">
          {sessions.map((session, index) => (
            <li key={session.id} className="grid grid-cols-[76px_16px_1fr] gap-x-3">
              <div className="pt-0.5 text-right">
                <p className="text-[13px] font-semibold text-ink">{session.time}</p>
                <p className="text-[12px] text-ink-secondary">{session.dayLabel}</p>
              </div>
              <div className="flex flex-col items-center" aria-hidden="true">
                <span className="mt-1.5 size-3 rounded-full border-2 border-brand-accent bg-white" />
                {index < sessions.length - 1 && <span className="mt-1 w-px flex-1 bg-hairline" />}
              </div>
              <div className="flex items-start justify-between gap-3 pb-5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-ink">{session.title}</p>
                  <p className="text-[12px] text-ink-secondary">{session.batchName}</p>
                  <p className="text-[12px] text-ink-secondary">{session.mentorName}</p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Sessions are coming soon"
                  className="h-9 shrink-0 rounded-button border border-hairline px-3 text-[13px] font-medium text-ink-secondary opacity-60"
                >
                  View
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </ChartCard>
  );
}
