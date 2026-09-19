interface DetailHeaderProps {
  name: string;
  subtitle?: string;
  statusTag?: React.ReactNode;
  action?: React.ReactNode;
}

export function DetailHeader({ name, subtitle, statusTag, action }: DetailHeaderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="glass-regular flex flex-col gap-4 rounded-card px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <span className="glass-thin flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-brand-accent">
          {initial}
        </span>
        <div>
          <p className="text-[18px] font-semibold text-ink">{name}</p>
          {subtitle && <p className="text-[13px] text-ink-secondary">{subtitle}</p>}
          {statusTag && <div className="mt-1">{statusTag}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}
