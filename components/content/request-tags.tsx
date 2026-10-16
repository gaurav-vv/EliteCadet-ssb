import { cn } from "cn";
import { REQUEST_STATUSES, SETTLEMENT_STATUSES, type ContentRequestStatus, type SettlementStatus } from "@/types/content";

const DOT: Record<ContentRequestStatus, string> = {
  requested: "bg-ink-secondary",
  quoted: "bg-warning",
  accepted: "bg-brand-accent",
  in_progress: "bg-brand-accent",
  delivered: "bg-success",
  declined: "bg-ink-secondary",
  cancelled: "bg-ink-secondary",
};

// Status = dot + text, never colour alone (§7.10).
export function RequestStatusTag({ status }: { status: ContentRequestStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", DOT[status])} />
      {REQUEST_STATUSES[status]}
    </span>
  );
}

export function SettlementTag({ settlement }: { settlement: SettlementStatus }) {
  if (settlement === "not_due") return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", settlement === "owed" ? "bg-warning" : "bg-success")} />
      {SETTLEMENT_STATUSES[settlement]}
    </span>
  );
}
