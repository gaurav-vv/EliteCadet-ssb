import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudentActions } from "@/components/academy/student-actions";
import { getBatchName, getBatches, getMentorName, getStudentById } from "@/lib/api/academy";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getStudentById(id);
  return { title: result.data?.fullName ?? "Student" };
}

function formatDate(iso: string | null) {
  if (!iso) return "No activity yet";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [studentResult, batchesResult] = await Promise.all([getStudentById(id), getBatches()]);

  if (!studentResult.ok || !studentResult.data) {
    notFound();
  }

  const student = studentResult.data;
  const batches = batchesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/academy/students" className="text-xs text-brand-accent hover:underline">
          ← Students
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">{student.fullName}</h1>
        <p className="text-sm text-ink-secondary">
          {getBatchName(student.batchId)} · {getMentorName(student.mentorId)} · Last active {formatDate(student.lastActivityAt)}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-regular flex flex-col gap-1 px-5 py-4">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Readiness</span>
          <span className="text-[28px] font-bold text-ink">{student.readiness ?? "—"}</span>
        </div>
        <div className="glass-regular flex flex-col gap-1 px-5 py-4">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Status</span>
          <span className="text-sm text-ink">{student.status === "active" ? "Active" : "Inactive"}</span>
        </div>
      </section>

      <StudentActions
        studentId={student.id}
        status={student.status}
        batchId={student.batchId}
        batches={batches.map(({ id: batchId, name }) => ({ id: batchId, name }))}
      />
    </div>
  );
}
