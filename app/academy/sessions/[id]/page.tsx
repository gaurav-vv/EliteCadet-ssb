import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MeetingPanel } from "@/components/meetings/meeting-panel";
import { CancelSessionDialog } from "@/components/mentor/sessions/cancel-session-dialog";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { endMeetingAction } from "@/lib/actions/meetings";
import { cancelAcademyMeetingAction } from "@/lib/actions/sessions";
import { getMeetingAttendance, getMeetingView } from "@/lib/server/meetings/service";
import { getAcademySession } from "@/lib/server/sessions/service";

export const metadata: Metadata = { title: "Session" };

// Any session in the admin's own academy; anything else is "not found".
// Live meetings get the room, end/cancel controls and attendance.
export default async function AcademySessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scheduled?: string }> }) {
  const { id } = await params;
  const flags = await searchParams;
  const result = await getAcademySession(id);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/academy/sessions" className="text-[13px] text-ink-secondary no-underline">‹ Sessions</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this session. Please try again."} />
      </div>
    );
  }
  const meeting = result.data.meetingKind ? await Promise.all([getMeetingView(id), getMeetingAttendance(id)]) : null;
  const view = meeting?.[0].ok ? meeting[0].data : undefined;
  const s = view?.session ?? result.data;
  const live = s.status === "scheduled" && Boolean(s.actualStartedAt) && !s.actualEndedAt;
  const cancellable = Boolean(s.meetingKind) && s.status === "scheduled" && !s.actualStartedAt;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/academy/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      {flags.scheduled && (
        <Alert role="status">
          <AlertDescription>Meeting scheduled. It&apos;s on the mentor&apos;s and the students&apos; Sessions pages now.</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-[28px] font-bold text-ink">{s.title}</h1>
        {(live || cancellable) && (
          <div className="flex flex-wrap gap-3">
            {live && <ConfirmActionDialog triggerLabel="End meeting" title="End the meeting for everyone?" description="Everyone in the room is disconnected and the meeting moves to Past. Attendance is saved." confirmLabel="End meeting" destructive action={endMeetingAction.bind(null, s.id)} />}
            {cancellable && <CancelSessionDialog sessionId={s.id} cancelAction={cancelAcademyMeetingAction} />}
          </div>
        )}
      </div>
      <SessionAgenda sessions={[s]} show={{ batch: true, mentor: true }} empty={{ title: "", description: "" }} />
      {s.description && <p className="glass-regular rounded-card px-6 py-5 text-[14px] whitespace-pre-line text-ink-secondary">{s.description}</p>}
      {s.meetingKind && view && (
        <MeetingPanel session={s} join={view.join} role="admin" roomHref={`/academy/sessions/${s.id}/room`} attendance={meeting?.[1].ok ? (meeting[1].data ?? []) : null} />
      )}
      {s.meetingKind && !view && <RetryErrorState message={meeting?.[0].error?.message ?? "We couldn't check the meeting room. Please try again."} />}
      {!s.meetingKind && <p className="text-[13px] text-ink-secondary">This session was scheduled by its mentor with a meeting link or a location. Only the mentor can change it.</p>}
    </div>
  );
}
