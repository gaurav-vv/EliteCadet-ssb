import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MeetingRoom } from "@/components/meetings/meeting-room";
import { getMeetingView } from "@/lib/server/meetings/service";
import { formatIstDay, formatIstTimeRange } from "@/lib/server/sessions/validation";

const TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

// The room route for both roles. Who may enter, and when, is decided by
// getMeetingView on the server; anyone outside the meeting gets a 404.
export async function MeetingRoomPage({ id, backHref }: { id: string; backHref: string }) {
  const view = await getMeetingView(id);
  if (!view.ok && view.error?.code === "not_found") notFound();
  if (!view.ok || !view.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href={backHref} className="text-[13px] text-ink-secondary no-underline">‹ Back</Link>
        <RetryErrorState message={view.error?.message ?? "We couldn't load this meeting. Please try again."} />
      </div>
    );
  }
  const { session: s, viewer, join, opensAt } = view.data;
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href={backHref} className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Session details
      </Link>
      <div>
        <h1 className="text-[28px] font-bold text-ink">{s.title}</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">
          {s.meetingKind === "one_to_one" ? "One-to-one" : `Batch meeting${s.batchName ? ` · ${s.batchName}` : ""}`}
          {s.mentorName && viewer.role === "student" ? ` · with ${s.mentorName}` : ""} · {formatIstDay(s.startsAt)}, {formatIstTimeRange(s.startsAt, s.endsAt)}
        </p>
      </div>
      <MeetingRoom sessionId={s.id} title={s.title} role={viewer.role} kind={s.meetingKind!} initialJoin={join} opensAtLabel={`${TIME.format(new Date(opensAt))} IST`} backHref={backHref} />
    </div>
  );
}
