import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { StudentRowActions } from "@/components/academy/students/student-row-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { getAcademyBatchOptions } from "@/lib/api/batches";
import { getAcademyStudent } from "@/lib/server/academy-people/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Student" };

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

// One student of the admin's own academy. Another academy's student id is
// "not found" (server-side scope + RLS), never partial data.
export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, batches] = await Promise.all([getAcademyStudent(id), getAcademyBatchOptions()]);
  if (!result.ok && result.error?.code === "not_found") notFound();

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/academy/students" className="text-[13px] text-ink-secondary no-underline">‹ Students</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this student. Please try again."} />
      </div>
    );
  }

  const { student, mentors } = result.data;
  const name = student.fullName || student.email || "Unnamed student";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/academy/students" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Students
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-ink">{name}</h1>
          <p className="text-sm text-ink-secondary">{student.email ?? "No email on file"}</p>
        </div>
        <StudentRowActions student={student} batches={batches.data ?? []} />
      </div>

      <section aria-label="Student details" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Batch">
          {student.batchId ? <Link href={`/academy/batches/${student.batchId}`} className="text-ink">{student.batchName}</Link> : <span className="text-ink-secondary">No batch</span>}
        </InfoCard>
        <InfoCard label="Mentors">{mentors.length > 0 ? mentors.map((m) => m.name).join(", ") : <span className="text-ink-secondary">{student.batchId ? "No mentor on this batch" : "Assign a batch first"}</span>}</InfoCard>
        <InfoCard label="Account">
          <StatusBadge label={student.status === "active" ? "Active" : "Suspended"} tone={student.status === "active" ? "success" : "danger"} />
        </InfoCard>
        <InfoCard label="Last login">{formatDay(student.lastLoginAt) ?? <span className="text-ink-secondary">Never</span>}</InfoCard>
      </section>

      <section aria-labelledby="progress-heading" className="flex flex-col gap-3">
        <h2 id="progress-heading" className="text-[18px] font-semibold text-ink">Progress</h2>
        <div className="glass-regular rounded-card">
          <EmptyState title="No progress data yet" description="Practice, assessment and attendance tracking arrive in a later phase." />
        </div>
      </section>
    </div>
  );
}
