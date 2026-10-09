import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap, UserCog } from "lucide-react";
import { BatchMemberPicker } from "@/components/academy/batches/batch-member-picker";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { formatBatchDate } from "@/lib/academy/batch-list";
import { addBatchMentorAction, addStudentToBatchAction, removeBatchMentorAction, setStudentBatchAction } from "@/lib/actions/batches";
import { getBatchDetail } from "@/lib/api/batches";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { getAcademySessions } from "@/lib/server/sessions/service";

export const metadata: Metadata = { title: "Batch" };

// A batch's mentors and students — real Postgres membership (0007), scoped to
// the signed-in admin's academy. Another academy's batch id is "not found".
export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, sessions] = await Promise.all([getBatchDetail(id), getAcademySessions("upcoming", new Date().toISOString(), id)]);
  if (result.notFound) notFound();

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/academy/batches" className="text-[13px] text-ink-secondary no-underline">‹ Batches</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this batch. Please try again."} />
      </div>
    );
  }

  const { batch, students, availableStudents, availableMentors } = result.data;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/academy/batches" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Batches
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-bold text-ink">{batch.name}</h1>
          <StatusBadge label={batch.status === "active" ? "Active" : "Archived"} tone={batch.status === "active" ? "success" : "neutral"} />
        </div>
        <p className="text-sm text-ink-secondary">
          {batch.studentCount} {batch.studentCount === 1 ? "student" : "students"} · {batch.mentors.length}{" "}
          {batch.mentors.length === 1 ? "mentor" : "mentors"}
          {batch.startDate ? ` · Starts ${formatBatchDate(batch.startDate)}` : ""}
        </p>
      </div>

      <section aria-labelledby="mentors-heading" className="flex flex-col gap-3">
        <h2 id="mentors-heading" className="text-[18px] font-bold text-ink">
          Mentors
        </h2>
        <div className="glass-regular rounded-card px-5 py-5">
          <BatchMemberPicker
            id="add-mentor"
            label="Assign a mentor"
            placeholder="Choose a mentor"
            buttonLabel="Assign mentor"
            emptyHint="Every mentor in your academy is already on this batch, or you have none yet. Invite one from the Mentors page."
            options={availableMentors}
            action={addBatchMentorAction.bind(null, batch.id)}
          />
        </div>
        {batch.mentors.length === 0 ? (
          <div className="glass-regular rounded-card">
            <EmptyState icon={<UserCog aria-hidden="true" size={22} />} title="No mentors yet" description="Assign a mentor so they can see and evaluate this batch's students." />
          </div>
        ) : (
          <ListPanel>
            {batch.mentors.map((m) => (
              <ListRow key={m.id}>
                <span className="text-sm text-ink">{m.name}</span>
                <ConfirmActionDialog
                  triggerLabel="Remove"
                  triggerAriaLabel={`Remove ${m.name} from ${batch.name}`}
                  title="Remove mentor from batch?"
                  description={`${m.name} will no longer see ${batch.name} or its students.`}
                  confirmLabel="Remove"
                  destructive
                  action={removeBatchMentorAction.bind(null, batch.id, m.id)}
                />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
        <h2 id="sessions-heading" className="text-[18px] font-bold text-ink">
          Upcoming sessions
        </h2>
        <SessionAgenda sessions={sessions.data ?? []} show={{ mentor: true }} empty={{ title: "No upcoming sessions", description: "This batch's mentors haven't scheduled any yet." }} />
      </section>

      <section aria-labelledby="students-heading" className="flex flex-col gap-3">
        <h2 id="students-heading" className="text-[18px] font-bold text-ink">
          Students
        </h2>
        <div className="glass-regular rounded-card px-5 py-5">
          {/* Adding moves the student out of any other batch (one batch each). */}
          <BatchMemberPicker
            id="add-student"
            label="Add a student"
            placeholder="Choose a student without a batch"
            buttonLabel="Add student"
            emptyHint="All your academy's students are already in a batch. Add new students from the Students page."
            options={availableStudents.map((s) => ({ id: s.id, name: s.fullName || s.email || "Unnamed student" }))}
            action={addStudentToBatchAction.bind(null, batch.id)}
          />
        </div>
        {students.length === 0 ? (
          <div className="glass-regular rounded-card">
            <EmptyState icon={<GraduationCap aria-hidden="true" size={22} />} title="No students in this batch yet" description="Add students above." />
          </div>
        ) : (
          <ListPanel>
            {students.map((s) => (
              <ListRow key={s.id}>
                <Link href={`/academy/students/${s.id}`} className="min-w-0 no-underline">
                  <p className="truncate text-sm text-ink">{s.fullName || "Unnamed student"}</p>
                  <p className="truncate text-[13px] text-ink-secondary">{s.email ?? "No email"}</p>
                </Link>
                <ConfirmActionDialog
                  triggerLabel="Remove"
                  triggerAriaLabel={`Remove ${s.fullName || s.email} from ${batch.name}`}
                  title="Remove student from batch?"
                  description={`${s.fullName || s.email} stays in your academy, just without a batch.`}
                  confirmLabel="Remove"
                  destructive
                  action={setStudentBatchAction.bind(null, s.id, null)}
                />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
