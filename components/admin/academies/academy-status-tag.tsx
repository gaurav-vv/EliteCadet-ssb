import { cn } from "cn";
import type { AcademyStatus } from "@/types/academies";

// Status = colour dot + text label, never colour alone (§7.10).
export function AcademyStatusTag({ status }: { status: AcademyStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", status === "active" ? "bg-success" : "bg-danger")} />
      {status === "active" ? "Active" : "Suspended"}
    </span>
  );
}
