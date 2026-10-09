import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { CancelSessionDialog } from "@/components/mentor/sessions/cancel-session-dialog";
import { SessionForm } from "@/components/mentor/sessions/session-form";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { completeSessionAction } from "@/lib/actions/sessions";
import { getMySessionView, getScheduleFormData } from "@/lib/server/sessions/service";
import { utcIsoToIst } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Session" };

// Only the mentor's own session; any other id is "not found".
export default async function MentorSessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ scheduled?: string; outside?: string }> }) {
  const { id } = await params;
  const flags = await searchParams;
  const [result, form] = await Promise.all([getMySessionView(id), getScheduleFormData()]);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/mentor/sessions" className="text-[13px] text-ink-secondary no-underline">‹ Sessions</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this session. Please try again."} />
      </div>
    );
  }
  const { session: s, started } = result.data;
  const start = utcIsoToIst(s.startsAt);
  const end = utcIsoToIst(s.endsAt);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      {flags.scheduled && (
        <Alert role="status">
          <AlertDescription>Session scheduled. It&apos;s on your students&apos; Sessions page now.{flags.outside ? " Note: it's outside the availability you've set." : ""}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-[28px] font-bold text-ink">{s.title}</h1>
        {s.status === "scheduled" && (
          <div className="flex flex-wrap gap-3">
            {started && <ConfirmActionDialog triggerLabel="Mark completed" title="Mark this session completed?" description="It moves to Past for you and your students." confirmLabel="Mark completed" action={completeSessionAction.bind(null, s.id)} />}
            <CancelSessionDialog sessionId={s.id} />
          </div>
        )}
      </div>
      <SessionAgenda sessions={[s]} show={{ batch: true, link: true }} empty={{ title: "", description: "" }} />
      {s.status === "scheduled" && form.ok && form.data && (
        <section aria-labelledby="edit-heading" className="flex flex-col gap-3">
          <h2 id="edit-heading" className="text-[18px] font-bold text-ink">Edit</h2>
          <SessionForm
            batches={form.data.batches}
            sessionId={s.id}
            initial={{
              batchId: s.batchId,
              title: s.title,
              description: s.description ?? "",
              date: start.date,
              startTime: start.time,
              endTime: end.time,
              mode: s.mode,
              meetingUrl: s.meetingUrl ?? "",
              location: s.location ?? "",
              forWholeBatch: s.forWholeBatch,
              participantIds: s.participantIds,
            }}
          />
        </section>
      )}
    </div>
  );
}
