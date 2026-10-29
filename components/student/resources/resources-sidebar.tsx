import Link from "next/link";
import { cn } from "cn";
import { BookMarked, ChevronRight, FileDown, Layers, Newspaper, PlayCircle } from "lucide-react";
import { CATEGORY_ICON, CATEGORY_ICON_TONE, SidePanel } from "@/components/student/resources/resource-ui";
import { ResourcePhotoImage } from "@/components/student/resources/resource-photo";
import { CATEGORY_SLUGS, getCategoryCounts, getEditorsPicks } from "@/lib/api/resources";
import { RESOURCE_CATEGORIES } from "@/types/resources";

const QUICK_LINKS = [
  { href: "/student/resources/downloads", label: "Downloadable PDFs", hint: "Checklists, worksheets and study guides", Icon: FileDown },
  { href: "/student/resources/videos", label: "SSB Preparation Videos", hint: "Curated video content", Icon: PlayCircle },
  { href: "/student/resources/reading", label: "Recommended Reading", hint: "Books, official guides and articles", Icon: BookMarked },
  { href: "/student/resources/current-affairs", label: "Daily Current Affairs", hint: "Dated official defence releases", Icon: Newspaper },
  { href: "/student/resources/day-2", label: "Day 2 Study Library", hint: "Psychology & GTO by test", Icon: Layers },
];

const rowClass = "row-hover-tint flex min-h-11 items-center gap-3 rounded-xl px-2 py-2 no-underline";

export function QuickLinksPanel() {
  return (
    <SidePanel title="Quick Links" titleId="quick-links-title">
      <ul className="flex flex-col gap-1.5">
        {QUICK_LINKS.map(({ href, label, hint, Icon }) => (
          <li key={href}>
            <Link href={href} className={`${rowClass} border border-hairline`}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                <Icon aria-hidden="true" size={19} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-semibold text-ink">{label}</span>
                <span className="truncate text-[12px] text-ink-secondary">{hint}</span>
              </span>
              <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
            </Link>
          </li>
        ))}
      </ul>
    </SidePanel>
  );
}

export function PopularResourcesPanel() {
  const picks = getEditorsPicks();
  return (
    <SidePanel title="Popular Resources" titleId="popular-title" footnote="Editor's picks — good places to start.">
      <ol className="flex flex-col gap-1">
        {picks.map((r, i) => (
          <li key={r.slug}>
            <Link href={`/student/resources/${r.slug}`} className={rowClass}>
              <span aria-hidden="true" className="w-5 shrink-0 text-center text-[15px] font-semibold text-ink">
                {i + 1}
              </span>
              <span className="relative block size-11 shrink-0 overflow-hidden rounded-lg">
                <ResourcePhotoImage photo={r.photo} sizes="44px" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-ink">{r.title}</span>
                <span className="text-[12px] text-ink-secondary">{r.category}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </SidePanel>
  );
}

export function ResourceCategoriesPanel() {
  const counts = getCategoryCounts();
  return (
    <SidePanel title="Resource Categories" titleId="categories-title">
      <ul className="flex flex-col gap-1">
        {RESOURCE_CATEGORIES.map((c) => {
          const Icon = CATEGORY_ICON[c];
          return (
            <li key={c}>
              <Link href={`/student/resources/category/${CATEGORY_SLUGS[c]}`} className={rowClass}>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_ICON_TONE[c]}`}>
                  <Icon aria-hidden="true" size={18} />
                </span>
                <span className="flex-1 text-[13px] font-medium text-ink">{c}</span>
                <span className="text-[12px] text-ink-secondary">
                  {counts[c]}
                  <span className="sr-only"> articles</span>
                </span>
                <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
              </Link>
            </li>
          );
        })}
      </ul>
    </SidePanel>
  );
}

export function ResourcesSidebar({ className }: { className?: string }) {
  return (
    <aside aria-label="Resource shortcuts" className={cn("flex flex-col gap-5", className)}>
      <QuickLinksPanel />
      <PopularResourcesPanel />
      <ResourceCategoriesPanel />
    </aside>
  );
}
