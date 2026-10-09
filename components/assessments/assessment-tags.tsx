import { cn } from "cn";
import { ASSESSMENT_STATUSES, EVALUATION_STATUSES, type AssessmentStatus, type EvaluationStatus } from "@/types/assessments";

function Tag({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

// Status = dot + text, never colour alone (§7.10).
export function AssessmentStatusTag({ status }: { status: AssessmentStatus }) {
  return <Tag dot={status === "published" ? "bg-success" : status === "draft" ? "bg-warning" : "bg-ink-secondary"} label={ASSESSMENT_STATUSES[status]} />;
}

export function EvaluationStatusTag({ status }: { status: EvaluationStatus }) {
  return <Tag dot={status === "reviewed" ? "bg-success" : status === "in_review" ? "bg-brand-accent" : "bg-warning"} label={EVALUATION_STATUSES[status]} />;
}
