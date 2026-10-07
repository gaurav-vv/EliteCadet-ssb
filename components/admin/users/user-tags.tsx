import { cn } from "cn";
import { ROLE_LABELS, type Role, type UserStatus } from "@/types/auth";

// Role is a category, not a state: a neutral chip, never a status colour (§7.1/§7.2).
export function RoleTag({ role }: { role: Role }) {
  return <span className="glass-thin inline-flex rounded-control px-2.5 py-1 text-[12px] whitespace-nowrap text-ink">{ROLE_LABELS[role]}</span>;
}

// Status = colour dot + text label, never colour alone (§7.10). Text stays in
// ink so it keeps 4.5:1 contrast on glass; only the dot carries the colour.
export function UserStatusTag({ status }: { status: UserStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", status === "active" ? "bg-success" : "bg-danger")} />
      {status === "active" ? "Active" : "Suspended"}
    </span>
  );
}
