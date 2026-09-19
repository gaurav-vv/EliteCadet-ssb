import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { AddStudentForm } from "@/components/academy/add-student-form";
import { getBatchName, getBatches, getMentorName, getStudents } from "@/lib/api/academy";

export const metadata: Metadata = { title: "Students" };

const STATUS_LABEL: Record<string, string> = { active: "Active", inactive: "Inactive" };

function formatDate(iso: string | null) {
  if (!iso) return "No activity yet";
  return `Active ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export default async function StudentsPage() {
  const [studentsResult, batchesResult] = await Promise.all([getStudents(), getBatches()]);
  const students = studentsResult.data ?? [];
  const batches = batchesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Students</h1>
        <p className="text-sm text-ink-secondary">{students.length} students across your academy.</p>
      </div>

      <AddStudentForm batches={batches.map(({ id, name }) => ({ id, name }))} />

      {students.length === 0 ? (
        <EmptyState title="No students yet" description="Add your first student above." />
      ) : (
        <ul className="flex flex-col gap-2">
          {students.map((student) => (
            <li key={student.id}>
              <Link
                href={`/academy/students/${student.id}`}
                className="glass-regular flex flex-col gap-1 px-5 py-4 no-underline hover:-translate-y-0.5 hover:scale-[1.01] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{student.fullName}</p>
                  <p className="text-xs text-ink-secondary">
                    {getBatchName(student.batchId)} · {getMentorName(student.mentorId)} · {formatDate(student.lastActivityAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink">{student.readiness ?? "—"}</span>
                  <span className="text-xs text-ink-secondary">{STATUS_LABEL[student.status]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
