import Link from "next/link";
import { CalendarClock, MapPin, Video } from "lucide-react";
import { cn } from "cn";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIstDay, formatIstTimeRange, istDayKey } from "@/lib/server/sessions/validation";
import type { SessionRecord, SessionState } from "@/types/sessions";

const STATUS: Record<SessionState, { label: string; dot: string }> = {
  scheduled: { label: "Scheduled", dot: "bg-brand-accent" },
  completed: { label: "Completed", dot: "bg-success" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
};

interface SessionAgendaProps {
  sessions: SessionRecord[];
  // Which details to show for this viewer.
  show: { batch?: boolean; mentor?: boolean; link?: boolean };
  hrefFor?: (s: SessionRecord) => string;
  empty: { title: string; description: string };
}

// One agenda for every role (mentor / batch / student / academy calendars):
// sessions grouped by IST day, each with time, mode and status (dot + text).
export function SessionAgenda({ sessions, show, hrefFor, empty }: SessionAgendaProps) {
  if (sessions.length === 0) {
    return (
      <div className="glass-regular rounded-card">
        <EmptyState icon={<CalendarClock aria-hidden="true" size={22} />} title={empty.title} description={empty.description} />
      </div>
    );
  }
  const days = new Map<string, SessionRecord[]>();
  for (const s of sessions) {
    const key = istDayKey(s.startsAt);
    days.set(key, [...(days.get(key) ?? []), s]);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...days.entries()].map(([key, list]) => (
        <section key={key} aria-label={formatIstDay(list[0].startsAt)} className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{formatIstDay(list[0].startsAt)}</h3>
          <ul className="flex flex-col gap-2">
            {list.map((s) => {
              const body = (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{s.title}</p>
                      <p className="text-[13px] text-ink-secondary">
                        {formatIstTimeRange(s.startsAt, s.endsAt)}
                        {show.batch && s.batchName ? ` · ${s.batchName}` : ""}
                        {show.mentor && s.mentorName ? ` · with ${s.mentorName}` : ""}
                        {` · ${s.forWholeBatch ? "Whole batch" : `${s.participantIds.length} selected ${s.participantIds.length === 1 ? "student" : "students"}`}`}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
                      <span aria-hidden="true" className={cn("size-2 rounded-full", STATUS[s.status].dot)} />
                      {STATUS[s.status].label}
                    </span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
                    {s.mode === "online" ? <Video aria-hidden="true" size={14} /> : <MapPin aria-hidden="true" size={14} />}
                    {s.mode === "online" ? "Online" : (s.location ?? "Offline")}
                  </p>
                  {s.status === "cancelled" && s.cancelReason && <p className="text-[13px] text-ink">Cancelled: {s.cancelReason}</p>}
                </>
              );
              return (
                <li key={s.id} className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
                  {hrefFor ? (
                    <Link href={hrefFor(s)} className="flex flex-col gap-1.5 no-underline">{body}</Link>
                  ) : (
                    body
                  )}
                  {show.link && s.mode === "online" && s.meetingUrl && s.status === "scheduled" && (
                    <a href={s.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit min-h-11 items-center text-sm text-brand-accent">
                      Join meeting <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
