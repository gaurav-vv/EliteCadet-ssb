import { DataTable } from "@/components/academy/shared/data-table";
import { ProgressBar } from "@/components/academy/shared/progress-bar";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { StudentRowActions } from "@/components/academy/students/student-row-actions";
import { readinessBand } from "@/lib/academy/readiness";
import type { DashboardTone, StudentDisplayStatus, StudentRow } from "@/types/academy";

interface StudentTableProps {
  rows: StudentRow[];
  batches: { id: string; name: string }[];
}

const STATUS: Record<StudentDisplayStatus, { label: string; tone: DashboardTone }> = {
  active: { label: "Active", tone: "success" },
  inactive: { label: "Inactive", tone: "neutral" },
  attention: { label: "Needs attention", tone: "warning" },
};

function formatActivity(iso: string | null): string {
  if (!iso) return "No activity yet";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}

const muted = (text: string) => <span className="text-ink-secondary">{text}</span>;

// Desktop/tablet: a real table. Phones: DataTable turns each row into a
// compact card (student, batch, mentor, performance, status, actions).
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
                {s.initials}
              </span>
              <span className="flex min-w-0 flex-col text-left">
                <span>{s.fullName}</span>
                {s.attentionReason && <span className="text-[12px] font-normal text-ink-secondary">{s.attentionReason}</span>}
              </span>
            </span>
          ),
        },
        { key: "batch", header: "Batch", cell: (s) => s.batchName ?? muted("Unassigned") },
        { key: "mentor", header: "Mentor", cell: (s) => s.mentorName ?? muted("Unassigned") },
        {
          key: "performance",
          header: "Performance",
          className: "min-w-44",
          cell: (s) => {
            if (s.readiness === null) return <ProgressBar value={null} emptyLabel="Not assessed" label={`${s.fullName} performance`} />;
            const band = readinessBand(s.readiness);
            return (
              <ProgressBar
                value={s.readiness}
                tone={band.tone}
                statusLabel={band.label}
                valueLabel={`${s.readiness}/100`}
                label={`${s.fullName} performance`}
              />
            );
          },
        },
        { key: "activity", header: "Last Activity", cell: (s) => (s.lastActivityAt ? formatActivity(s.lastActivityAt) : muted("No activity yet")) },
        {
          key: "status",
          header: "Status",
          cell: (s) => <StatusBadge label={STATUS[s.status].label} tone={STATUS[s.status].tone} />,
        },
        {
          key: "actions",
          header: "Actions",
          align: "right",
          cell: (s) => <StudentRowActions student={s} batches={batches} />,
        },
      ]}
    />
  );
}
