import Link from "next/link";
import { cn } from "cn";

export function ListPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card", className)}>{children}</div>;
}

interface ListRowProps {
  href?: string;
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function ListRow({ href, selected, children, className }: ListRowProps) {
  const rowClassName = cn(
    "row-hover-tint flex items-center justify-between gap-3 px-5 py-3.5 no-underline",
    className,
  );

  if (href) {
    return (
      <Link href={href} data-selected={selected} className={rowClassName}>
        {children}
      </Link>
    );
  }

  return (
    <div data-selected={selected} className={rowClassName}>
      {children}
    </div>
  );
}
