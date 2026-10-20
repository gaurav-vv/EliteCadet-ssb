import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MeetingRoom } from "@/components/meetings/meeting-room";
import { SessionInfoPanel } from "@/components/meetings/session-info-panel";
import { getMeetingView } from "@/lib/server/meetings/service";

const TIME = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

// The room route for every role. Who may enter, and when, is decided by
// getMeetingView on the server; anyone outside the meeting gets a 404.
// Layout follows session_ref.png: session details | video stage | chat & people.
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
  const { session: s, viewer, join, opensAt, audienceCount } = view.data;
  return (
    <div className="flex flex-col gap-4 pb-10">
      <Link href={backHref} className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Session details
      </Link>
      <div className="grid gap-4 2xl:grid-cols-[240px_minmax(0,1fr)] 2xl:items-start">
        <SessionInfoPanel session={s} viewerRole={viewer.role} audienceCount={audienceCount} />
        <MeetingRoom
          sessionId={s.id}
          title={s.title}
          role={viewer.role}
          viewerId={viewer.id}
          kind={s.meetingKind!}
          initialJoin={join}
          opensAtLabel={`${TIME.format(new Date(opensAt))} IST`}
          backHref={backHref}
          hostName={s.mentorName ?? "the host"}
        />
      </div>
    </div>
  );
}
