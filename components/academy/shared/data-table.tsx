import Link from "next/link";
import { cn } from "cn";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  cell: (row: Row) => React.ReactNode;
  align?: "left" | "right";
  // The first column is the row's primary label on mobile cards.
  className?: string;
}

interface DataTableProps<Row> {
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  getRowHref?: (row: Row) => string;
}

// ≥md: a real <table>. <md: one stacked record card per row with label/value
// pairs (AGENTS.md §7.9) — never a horizontally scrolling table on phones.
// Server-renderable (cell renderers are functions, so rows stay on the server).
export function DataTable<Row>({ caption, columns, rows, getRowKey, getRowHref }: DataTableProps<Row>) {
  const [primary, ...rest] = columns;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-surface-base">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-3 py-2.5 text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase first:rounded-l-control last:rounded-r-control",
                    c.align === "right" && "text-right",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = getRowHref?.(row);
              return (
                <tr key={getRowKey(row)} className="row-hover-tint border-b border-hairline last:border-0">
                  {columns.map((c, i) => (
                    <td key={c.key} className={cn("px-3 py-3.5 text-ink", c.align === "right" && "text-right", c.className)}>
                      {i === 0 && href ? (
                        <Link href={href} className="font-medium text-ink no-underline hover:text-brand-accent">
                          {c.cell(row)}
                        </Link>
                      ) : (
                        c.cell(row)
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const href = getRowHref?.(row);
          return (
            <li key={getRowKey(row)} className="rounded-control border border-hairline p-4">
              <p className="text-[14px] font-semibold text-ink">
                {href ? (
                  <Link href={href} className="text-ink no-underline hover:text-brand-accent">
                    {primary.cell(row)}
                  </Link>
                ) : (
                  primary.cell(row)
                )}
              </p>
              <dl className="mt-3 flex flex-col gap-2">
                {rest.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-4">
                    <dt className="text-[12px] text-ink-secondary">{c.header}</dt>
                    <dd className="min-w-0 flex-1 text-right text-[13px] text-ink">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
