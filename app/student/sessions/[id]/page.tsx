import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MeetingPanel } from "@/components/meetings/meeting-panel";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { getMeetingView } from "@/lib/server/meetings/service";
import { getMyStudentSession } from "@/lib/server/sessions/service";

export const metadata: Metadata = { title: "Session" };

// A session the student can see (RLS); any other id is "not found".
export default async function StudentSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyStudentSession(id);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/student/sessions" className="text-[13px] text-ink-secondary no-underline">‹ Sessions</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this session. Please try again."} />
      </div>
    );
  }
  const view = result.data.meetingKind ? await getMeetingView(id) : null;
  const s = view?.ok && view.data ? view.data.session : result.data;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/student/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      <h1 className="text-[28px] font-bold text-ink">{s.title}</h1>
      <SessionAgenda sessions={[s]} show={{ mentor: true, link: true }} empty={{ title: "", description: "" }} />
      {s.description && <p className="glass-regular rounded-card px-6 py-5 text-[14px] whitespace-pre-line text-ink-secondary">{s.description}</p>}
      {s.meetingKind && view?.ok && view.data && <MeetingPanel session={s} join={view.data.join} role="student" roomHref={`/student/sessions/${s.id}/room`} />}
      {s.meetingKind && view && !view.ok && <RetryErrorState message={view.error?.message ?? "We couldn't check the meeting room. Please try again."} />}
    </div>
  );
}
