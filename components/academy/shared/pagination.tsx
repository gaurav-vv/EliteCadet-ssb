import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  // Builds the URL for a given page, preserving the current filters.
  buildHref: (page: number) => string;
  noun?: { one: string; many: string };
}

const linkClass =
  "inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-button border border-hairline bg-white px-3 text-[13px] font-medium text-ink no-underline hover:bg-black/5 sm:h-9 sm:min-w-9";
const disabledClass = `${linkClass} pointer-events-none opacity-40`;

// Plain links, not client state: each page is a URL, so it is bookmarkable and
// works without JavaScript.
export function Pagination({ page, pageCount, pageSize, total, buildHref, noun = { one: "item", many: "items" } }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p className="text-[13px] text-ink-secondary">
        Showing {from}–{to} of {total} {total === 1 ? noun.one : noun.many}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={buildHref(page - 1)} className={linkClass} aria-label="Previous page">
              <ChevronLeft aria-hidden="true" size={16} />
              Previous
            </Link>
          ) : (
            <span aria-hidden="true" className={disabledClass}>
              <ChevronLeft size={16} />
              Previous
            </span>
          )}
          <span className="px-2 text-[13px] text-ink-secondary" aria-current="page">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={buildHref(page + 1)} className={linkClass} aria-label="Next page">
              Next
              <ChevronRight aria-hidden="true" size={16} />
            </Link>
          ) : (
            <span aria-hidden="true" className={disabledClass}>
              Next
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
