interface PageHeaderProps {
  title: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, primaryAction, secondaryActions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-ink-secondary sm:text-[15px]">{subtitle}</p>}
      </div>
      {(primaryAction || secondaryActions) && (
        <div className="flex shrink-0 items-center gap-2">
          {secondaryActions}
          {primaryAction}
        </div>
      )}
    </div>
  );
}
