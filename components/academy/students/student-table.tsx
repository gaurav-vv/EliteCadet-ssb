import { DataTable } from "@/components/academy/shared/data-table";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { StudentRowActions } from "@/components/academy/students/student-row-actions";
import { formatDay } from "@/lib/utils/format-date";
import type { AcademyStudentRecord } from "@/types/academy-people";
import type { ProgressSummary } from "@/types/progress";

const muted = (text: string) => <span className="text-ink-secondary">{text}</span>;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// Only columns backed by real data. Phones: DataTable renders one card per student.
export function StudentTable({ rows, batches, hrefBase = "/academy/students", showActions = true, progress }: { rows: AcademyStudentRecord[]; batches: { id: string; name: string }[]; hrefBase?: string; showActions?: boolean; progress?: Map<string, ProgressSummary> }) {
  return (
    <DataTable
      caption="Students"
      rows={rows}
      getRowKey={(s) => s.id}
      getRowHref={(s) => `${hrefBase}/${s.id}`}
      columns={[
        {
          key: "student",
          header: "Student",
          cell: (s) => (
            <span className="inline-flex items-center gap-3">
              <span aria-hidden="true" className="academy-tint flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold">
                {initials(s.fullName || s.email || "?")}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span>{s.fullName || "Unnamed student"}</span>
                <span className="text-[12px] font-normal text-ink-secondary">{s.email ?? "No email"}</span>
              </span>
            </span>
          ),
        },
        { key: "batch", header: "Batch", cell: (s) => s.batchName ?? muted("No batch") },
        { key: "status", header: "Account", cell: (s) => <StatusBadge label={s.status === "active" ? "Active" : "Suspended"} tone={s.status === "active" ? "success" : "danger"} /> },
        { key: "login", header: "Last Login", cell: (s) => formatDay(s.lastLoginAt) ?? muted("Never") },
        ...(progress
          ? [
              { key: "score", header: "Avg Score", cell: (s: AcademyStudentRecord) => { const v = progress.get(s.id)?.avgScorePct; return v == null ? muted("No reviews") : `${v}%`; } },
              { key: "attendance", header: "Attendance", cell: (s: AcademyStudentRecord) => { const v = progress.get(s.id)?.attendancePct; return v == null ? muted("Not marked") : `${v}%`; } },
            ]
          : [{ key: "joined", header: "Joined", cell: (s: AcademyStudentRecord) => formatDay(s.createdAt) }]),
        ...(showActions ? [{ key: "actions", header: "Actions", align: "right" as const, cell: (s: AcademyStudentRecord) => <StudentRowActions student={s} batches={batches} /> }] : []),
      ]}
    />
  );
}
