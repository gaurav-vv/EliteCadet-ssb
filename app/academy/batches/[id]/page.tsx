import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { BatchMentorAssign, RemoveStudentButton } from "@/components/academy/batch-actions";
import { AddExistingStudentToBatch } from "@/components/academy/add-existing-student-to-batch";
import { getBatchById, getMentors, getStudents } from "@/lib/api/academy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getBatchById(id);
  return { title: result.data?.name ?? "Batch" };
}

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [batchResult, studentsResult, mentorsResult] = await Promise.all([
    getBatchById(id),
    getStudents(),
    getMentors(),
  ]);

  if (!batchResult.ok || !batchResult.data) {
    notFound();
  }

  const batch = batchResult.data;
  const students = studentsResult.data ?? [];
  const mentors = mentorsResult.data ?? [];
  const members = students.filter((s) => batch.studentIds.includes(s.id));
  const unassigned = students.filter((s) => !s.batchId);

  const scored = members.filter((m) => m.readiness !== null);
  const averageReadiness =
    scored.length > 0 ? Math.round(scored.reduce((sum, m) => sum + (m.readiness ?? 0), 0) / scored.length) : null;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/academy/batches" className="text-xs text-brand-navy hover:underline">
          ← Batches
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">{batch.name}</h1>
        <p className="text-sm text-text-muted">
          {members.length} students · Average readiness: {averageReadiness ?? "—"}
        </p>
      </div>

      <div className="glass-surface flex flex-col gap-4 px-6 py-6">
        <BatchMentorAssign batchId={batch.id} mentorId={batch.mentorId} mentors={mentors} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Members</h2>
        <AddExistingStudentToBatch batchId={batch.id} unassignedStudents={unassigned.map(({ id: sid, fullName }) => ({ id: sid, fullName }))} />
        {members.length === 0 ? (
          <EmptyState title="No students in this batch yet" description="Add one above." />
        ) : (
          <ul className="flex flex-col gap-2">
            {members.map((student) => (
              <li key={student.id} className="glass-surface flex items-center justify-between px-5 py-3">
                <Link href={`/academy/students/${student.id}`} className="text-sm text-text-primary hover:underline">
                  {student.fullName}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-muted">{student.readiness ?? "—"}</span>
                  <RemoveStudentButton batchId={batch.id} studentId={student.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
