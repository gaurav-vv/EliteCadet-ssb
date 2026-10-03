import { BatchRowActions } from "@/components/academy/batches/batch-row-actions";
import { DataTable } from "@/components/academy/shared/data-table";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { formatBatchDate, formatCreatedMonth } from "@/lib/academy/batch-list";
import type { BatchMentorOption, BatchRecord } from "@/types/academy";

const muted = (text: string) => <span className="text-ink-secondary">{text}</span>;

// Only columns backed by real data. Desktop/tablet: a table. Phones: one card
// per batch with the same fields.
export function BatchTable({ rows, mentors }: { rows: BatchRecord[]; mentors: BatchMentorOption[] }) {
  return (
    <DataTable
      caption="Batches"
      rows={rows}
      getRowKey={(b) => b.id}
      columns={[
        {
          key: "batch",
          header: "Batch",
          cell: (b) => (
            <span className="flex min-w-0 flex-col text-left">
              <span className="font-medium text-ink">{b.name}</span>
              <span className="text-[12px] font-normal text-ink-secondary">Created {formatCreatedMonth(b.createdAt)}</span>
            </span>
          ),
        },
        { key: "mentor", header: "Mentor", cell: (b) => b.mentorName ?? muted("No mentor") },
        { key: "start", header: "Start Date", cell: (b) => (b.startDate ? formatBatchDate(b.startDate) : muted("Not set")) },
        {
          key: "status",
          header: "Status",
          cell: (b) => <StatusBadge label={b.status === "active" ? "Active" : "Archived"} tone={b.status === "active" ? "success" : "neutral"} />,
        },
        { key: "actions", header: "Actions", align: "right", cell: (b) => <BatchRowActions batch={b} mentors={mentors} /> },
      ]}
    />
  );
}
