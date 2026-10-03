import { SectionHeader } from "@/components/academy/shared/section-header";
import { cn } from "cn";

interface ChartCardProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  // Extra control on the header's right (range selector, "Demo data" badge…).
  headerExtra?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// Standard container for any Academy panel (charts, tables, lists): white
// card, hairline border, section header, then content. Each panel is a named
// landmark (aria-labelledby) for screen readers.
export function ChartCard({ title, description, action, headerExtra, badge, className, children }: ChartCardProps) {
  const headingId = `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section aria-labelledby={headingId} className={cn("glass-regular flex min-w-0 flex-col gap-4 rounded-card p-5 sm:p-6", className)}>
      <SectionHeader id={headingId} title={title} description={description} action={action} extra={headerExtra} badge={badge} />
      {children}
    </section>
  );
}
