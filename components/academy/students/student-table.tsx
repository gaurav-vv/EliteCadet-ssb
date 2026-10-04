import { DataTable } from "@/components/academy/shared/data-table";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { StudentRowActions } from "@/components/academy/students/student-row-actions";
import { formatStudentDate, initialsOf } from "@/lib/academy/student-list";
import type { StudentBatchOption, StudentRecord } from "@/types/academy";

interface StudentTableProps {
  rows: StudentRecord[];
  batches: StudentBatchOption[];
}

const muted = (text: string) => <span className="text-ink-secondary">{text}</span>;

// Only columns backed by real data. Desktop/tablet: a table. Phones: DataTable turns
// each row into a compact card (student, batch, status, created, actions).
export function StudentTable({ rows, batches }: StudentTableProps) {
  return (
    <DataTable
      caption="Students"
      rows={rows}
      getRowKey={(s) => s.id}
      getRowHref={(s) => `/academy/students/${s.id}`}
      columns={[
        {
          key: "student",
          header: "Student",
          cell: (s) => (
            <span className="inline-flex items-center gap-3">
              <span
                aria-hidden="true"
                className="academy-tint flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
              >
                {initialsOf(s.fullName)}
              </span>
              <span className="text-left">{s.fullName}</span>
            </span>
          ),
        },
        { key: "batch", header: "Batch", cell: (s) => s.batchName ?? muted("No batch") },
        {
          key: "status",
          header: "Status",
          cell: (s) => <StatusBadge label={s.status === "active" ? "Active" : "Inactive"} tone={s.status === "active" ? "success" : "neutral"} />,
        },
        { key: "created", header: "Created", cell: (s) => formatStudentDate(s.createdAt) },
        { key: "actions", header: "Actions", align: "right", cell: (s) => <StudentRowActions student={s} batches={batches} /> },
      ]}
    />
  );
}
