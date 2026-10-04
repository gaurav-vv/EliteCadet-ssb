import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { StudentDetailActions } from "@/components/academy/students/student-detail-actions";
import { PageHeader } from "@/components/ui/page-header";
import { getStudentBatchOptions, getStudentById } from "@/lib/api/students";
import { formatStudentDate } from "@/lib/academy/student-list";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getStudentById(id);
  return { title: result.data?.fullName ?? "Student" };
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <span className="text-[15px] font-medium text-ink">{children}</span>
    </div>
  );
}

// Phase 0 detail view: the student's real stored information plus edit.
// (Assessment history, analytics and a profile page belong to later phases.)
export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [studentResult, batchesResult] = await Promise.all([getStudentById(id), getStudentBatchOptions()]);

  if (studentResult.error?.code === "not_found") notFound();
  if (!studentResult.ok || !studentResult.data || !batchesResult.ok || !batchesResult.data) {
    const message = studentResult.error?.message ?? batchesResult.error?.message ?? "We couldn't load this student. Please try again.";
    return (
      <div className="flex flex-col gap-6">
        <Link href="/academy/students" className="text-[13px] text-brand-accent hover:underline">
          ← Students
        </Link>
        <RetryErrorState message={message} />
      </div>
    );
  }

  const student = studentResult.data;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <Link href="/academy/students" className="text-[13px] text-brand-accent hover:underline">
        ← Students
      </Link>
      <PageHeader
        title={student.fullName}
        subtitle="Student information"
        primaryAction={<StudentDetailActions student={student} batches={batchesResult.data} />}
      />

      <section aria-label="Student details" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <InfoCard label="Batch">{student.batchName ?? <span className="text-ink-secondary">No batch</span>}</InfoCard>
        <InfoCard label="Status">
          <StatusBadge label={student.status === "active" ? "Active" : "Inactive"} tone={student.status === "active" ? "success" : "neutral"} />
        </InfoCard>
        <InfoCard label="Added">{formatStudentDate(student.createdAt)}</InfoCard>
      </section>
    </div>
  );
}
