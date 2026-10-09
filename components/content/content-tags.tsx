import Link from "next/link";
import { cn } from "cn";
import { CONTENT_CATEGORIES, CONTENT_STATUSES, type ContentCategory, type ContentCategoryCounts, type ContentStatus } from "@/types/content";

// Status = dot + text, never colour alone (§7.10).
export function ContentStatusTag({ status }: { status: ContentStatus }) {
  const dot = status === "published" ? "bg-success" : status === "draft" ? "bg-warning" : "bg-ink-secondary";
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-ink">
      <span aria-hidden="true" className={cn("size-2 rounded-full", dot)} />
      {CONTENT_STATUSES[status]}
    </span>
  );
}

// Category is a category, not a state: neutral chip.
export function CategoryTag({ category }: { category: ContentCategory }) {
  return <span className="glass-thin inline-flex rounded-control px-2.5 py-1 text-[12px] whitespace-nowrap text-ink">{CONTENT_CATEGORIES[category]}</span>;
}

// "All (12) · Psychology (4) · …" tabs, as links so they're shareable URLs.
export function CategoryTabs({ active, counts, hrefFor }: { active: ContentCategory | "all"; counts?: ContentCategoryCounts; hrefFor: (c: ContentCategory | "all") => string }) {
  const keys: (ContentCategory | "all")[] = ["all", ...(Object.keys(CONTENT_CATEGORIES) as ContentCategory[])];
  return (
    <nav aria-label="Content categories" className="flex gap-2 overflow-x-auto pb-1">
      {keys.map((k) => {
        const selected = k === active;
        return (
          <Link
            key={k}
            href={hrefFor(k)}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-[13px] whitespace-nowrap no-underline",
              selected ? "border-brand-accent text-brand-accent" : "border-hairline text-ink-secondary hover:text-ink",
            )}
          >
            {k === "all" ? "All" : CONTENT_CATEGORIES[k]}
            {counts && <span className="ml-1.5 text-ink-secondary">({counts[k]})</span>}
          </Link>
        );
      })}
    </nav>
  );
}
