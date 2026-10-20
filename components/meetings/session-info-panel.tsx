import { CalendarDays, Clock, ShieldCheck, UserRound, Users } from "lucide-react";
import { cn } from "cn";
import { formatIstDay, formatIstTimeRange } from "@/lib/server/sessions/validation";
import { sessionDisplayState, type SessionRecord } from "@/types/sessions";

const STATE = {
  scheduled: { label: "Upcoming", dot: "bg-brand-accent" },
  live: { label: "Live", dot: "bg-success" },
  completed: { label: "Ended", dot: "bg-ink-secondary" },
  cancelled: { label: "Cancelled", dot: "bg-danger" },
} as const;

interface SessionInfoPanelProps {
  session: SessionRecord;
  viewerRole: "mentor" | "admin" | "student";
  audienceCount: number | null;
}

// The meeting's facts beside the room (reference: session_ref.png, left).
// Status is always dot + text (AGENTS.md §7.10).
export function SessionInfoPanel({ session: s, viewerRole, audienceCount }: SessionInfoPanelProps) {
  const state = STATE[sessionDisplayState(s)];
  const minutes = Math.round((Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60_000);
  const rows = [
    { icon: CalendarDays, text: formatIstDay(s.startsAt) },
    { icon: Clock, text: `${formatIstTimeRange(s.startsAt, s.endsAt)} (${minutes} min)` },
    { icon: UserRound, text: `Host: ${s.mentorName ?? "Mentor"}` },
    {
      icon: Users,
      text: s.meetingKind === "one_to_one" ? "One-to-one" : `Whole batch${audienceCount !== null ? ` · ${audienceCount} ${audienceCount === 1 ? "student" : "students"}` : ""}`,
    },
  ];
  return (
    <aside aria-label="Session details" className="glass-regular flex flex-col gap-3 rounded-card px-5 py-4 2xl:gap-4 2xl:py-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 2xl:flex-col 2xl:items-start">
        {s.batchName && <p className="w-full text-[13px] font-semibold text-ink-secondary">{s.batchName}</p>}
        <h1 className="text-[22px] leading-tight font-bold text-ink">{s.title}</h1>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-pill bg-surface-base px-2.5 py-1 text-[13px] font-medium text-ink">
          <span aria-hidden="true" className={cn("size-2 rounded-full", state.dot)} />
          {state.label}
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 2xl:flex-col 2xl:gap-2.5">
        {rows.map((r) => (
          <li key={r.text} className="flex items-start gap-2.5 text-[14px] text-ink">
            <r.icon aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-ink-secondary" />
            {r.text}
          </li>
        ))}
      </ul>
      {viewerRole === "student" && (
        <div className="flex gap-2.5 rounded-card bg-success-bg px-3.5 py-3">
          <ShieldCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
          <div>
            <p className="text-[13px] font-semibold text-ink">{s.meetingKind === "one_to_one" ? "This meeting is just for you" : "You are in this batch"}</p>
            <p className="text-[12px] text-ink-secondary">
              {s.meetingKind === "one_to_one" ? "A private session with your mentor." : "Every student in the batch can join. No separate invitation needed."}
            </p>
          </div>
        </div>
      )}
      <p className="text-[12px] text-ink-secondary">Not recorded. Attendance: present after 75% of the scheduled time in the room.</p>
    </aside>
  );
}
