import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatIstDay, formatIstTimeRange } from "@/lib/server/sessions/validation";
import type { JoinState, MeetingAttendanceRow } from "@/lib/server/meetings/service";
import type { SessionRecord } from "@/types/sessions";

const TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

const JOIN_COPY: Record<JoinState, string> = {
  open: "",
  too_early: "The room opens 15 minutes before the start.",
  waiting_for_mentor: "The room is open. Waiting for your mentor to start.",
  ended: "This meeting has ended.",
  cancelled: "This meeting was cancelled.",
  removed: "Your mentor removed you from this meeting.",
  not_configured: "Video meetings aren't set up on this server yet.",
};

interface MeetingPanelProps {
  session: SessionRecord;
  join: JoinState;
  role: "mentor" | "admin" | "student";
  roomHref: string;
  attendance?: MeetingAttendanceRow[] | null;
}

// The live-room part of a session page: what kind of meeting, whether you can
// go in now (decided by the server), what actually happened, and — for the
// mentor — who attended according to the video service.
export function MeetingPanel({ session: s, join, role, roomHref, attendance }: MeetingPanelProps) {
  const live = s.status === "scheduled" && Boolean(s.actualStartedAt) && !s.actualEndedAt;
  const action =
    join === "open" ? (
      <Button asChild className="min-h-11">
        <Link href={roomHref}>{role !== "student" ? (live ? "Rejoin meeting" : "Start meeting") : "Join meeting"}</Link>
      </Button>
    ) : join === "waiting_for_mentor" || join === "too_early" ? (
      <Button asChild variant="outline" className="min-h-11">
        <Link href={roomHref}>Open waiting room</Link>
      </Button>
    ) : null;

  return (
    <section aria-labelledby="meeting-heading" className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="meeting-heading" className="text-[18px] font-semibold text-ink">Live video room</h2>
          <p className="mt-1 text-[14px] text-ink-secondary">
            {s.meetingKind === "one_to_one" ? (role === "student" ? "One-to-one with your mentor" : "One-to-one") : `Whole batch${s.batchName ? ` · ${s.batchName}` : ""}`}
            {role === "admin" && s.mentorName ? ` · hosted by ${s.mentorName}` : ""}
            {" · "}
            {formatIstDay(s.startsAt)}, {formatIstTimeRange(s.startsAt, s.endsAt)}
          </p>
          {join !== "open" && <p className="mt-1 text-[14px] text-ink">{JOIN_COPY[join]}</p>}
        </div>
        {action}
      </div>
      {(s.actualStartedAt || s.actualEndedAt) && (
        <dl className="grid gap-3 text-[13px] sm:grid-cols-3">
          <div>
            <dt className="text-ink-secondary">Started</dt>
            <dd className="text-ink">{s.actualStartedAt ? TIME.format(new Date(s.actualStartedAt)) : "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Ended</dt>
            <dd className="text-ink">{s.actualEndedAt ? `${TIME.format(new Date(s.actualEndedAt))}${s.endedEarly ? " (early)" : ""}` : live ? "In progress" : "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-secondary">Duration</dt>
            <dd className="text-ink">
              {s.actualStartedAt && s.actualEndedAt ? `${Math.round((Date.parse(s.actualEndedAt) - Date.parse(s.actualStartedAt)) / 60_000)} min` : "—"}
            </dd>
          </div>
        </dl>
      )}
      <p className="text-[12px] text-ink-secondary">Meetings are not recorded. Only the people invited can join.</p>

      {attendance !== undefined && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Who joined</h3>
          <p className="text-[12px] text-ink-secondary">
            Present = in the room for at least 75% of the scheduled time ({attendance?.[0]?.requiredMinutes ?? Math.ceil(((Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60_000) * 0.75)} min). Only time inside the scheduled window counts; overlapping visits count once. Decided when the meeting ends.
          </p>
          {attendance === null ? (
            <p className="text-[13px] text-ink-secondary">We couldn&apos;t load who joined. Refresh to try again.</p>
          ) : attendance.length === 0 ? (
            <EmptyState icon={<Users aria-hidden="true" size={20} />} title="No one has joined yet" description="Joins are recorded by the video service once the meeting starts." />
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                  <th scope="col" className="py-2 pr-3 font-semibold">Name</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">First joined</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Time in room</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {attendance.map((a) => (
                  <tr key={a.userId}>
                    <td className="py-2 pr-3 text-ink">
                      {a.name}
                      {a.role === "mentor" ? " (host)" : a.role === "admin" ? " (academy admin)" : ""}
                    </td>
                    <td className="py-2 pr-3 text-ink-secondary">{TIME.format(new Date(a.firstJoinedAt))}</td>
                    <td className="py-2 pr-3 text-ink-secondary">
                      {a.minutes} min{a.joins > 1 ? ` · ${a.joins} joins` : ""}
                      {a.lastLeftAt === null ? " · in the room" : ""}
                    </td>
                    <td className="py-2 pr-3">
                      {a.role !== "student" ? (
                        <span className="text-ink-secondary">—</span>
                      ) : a.status ? (
                        <span className={a.status === "present" ? "text-success" : a.status === "absent" ? "text-danger" : "text-ink"}>
                          {a.status === "present" ? "Present" : a.status === "absent" ? "Absent" : "Excused"}
                          {a.markedByMentor ? " (set by mentor)" : ""}
                        </span>
                      ) : (
                        <span className="text-ink-secondary">{live ? "In progress" : "Not decided yet"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
