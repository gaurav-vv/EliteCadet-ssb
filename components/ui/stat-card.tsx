import { navIcons, type NavIconName } from "@/components/ui/nav-icons";
import { cn } from "cn";

interface StatCardProps {
  icon?: NavIconName;
  label: string;
  value: string | number;
  delta?: string;
  deltaTone?: "success" | "warning" | "danger";
}

const deltaClass: Record<NonNullable<StatCardProps["deltaTone"]>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function StatCard({ icon, label, value, delta, deltaTone = "success" }: StatCardProps) {
  const Icon = icon ? navIcons[icon] : null;

  return (
    <div className="glass-regular flex flex-col gap-2 rounded-card px-5 py-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon aria-hidden="true" size={16} className="text-ink-secondary" />}
        <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[28px] leading-none font-bold text-ink sm:text-[32px]">{value}</span>
        {delta && <span className={cn("text-[13px] font-medium", deltaClass[deltaTone])}>{delta}</span>}
      </div>
    </div>
  );
}
