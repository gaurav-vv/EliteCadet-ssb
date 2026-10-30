import Link from "next/link";
import {
  BookMarked,
  ChevronLeft,
  ExternalLink,
  Landmark,
  Library,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getReadingList } from "@/lib/api/resources";
import type { ReadingItem } from "@/types/resources";
import { resourcesBase, type ResourceAudience } from "@/lib/resources/paths";

const GROUPS: ReadingItem["group"][] = [
  "Officer qualities & military history",
  "Written exam (NDA/CDS)",
  "English & communication",
  "Official sources",
];
const KIND_ICON: Record<ReadingItem["kind"], LucideIcon> = {
  Book: BookMarked,
  "Free textbook": Library,
  "Official source": Landmark,
};

// Quick Link → Recommended Reading: books, free textbooks and official
// sources, each with why it helps. EliteCadet's own guides live in the
// library (main page + category pages), not repeated here.
export function ReadingView({
  audience = "student",
}: {
  audience?: ResourceAudience;
}) {
  const home = resourcesBase(audience);
  const items = getReadingList();

  return (
    <div className="flex flex-col gap-7 pb-10">
      <Link
        href={home}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        Resources
      </Link>
      <PageHeader
        title="Recommended Reading"
        subtitle="Books, free textbooks and official sources that support the written exam, the interview and officer-like thinking — with why each one helps."
      />

      {GROUPS.map((group) => {
        const inGroup = items.filter((i) => i.group === group);
        return (
          <section
            key={group}
            aria-labelledby={`g-${GROUPS.indexOf(group)}`}
            className="flex flex-col gap-3"
          >
            <h2
              id={`g-${GROUPS.indexOf(group)}`}
              className="text-[19px] font-semibold text-ink"
            >
              {group}
            </h2>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {inGroup.map((item) => {
                const Icon = KIND_ICON[item.kind];
                return (
                  <li
                    key={item.title}
                    className="glass-regular flex gap-4 rounded-card p-5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-accent/10 text-brand-accent">
                      <Icon aria-hidden="true" size={20} />
                    </span>
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
                        {item.kind}
                      </p>
                      <h3 className="text-[15px] leading-snug font-semibold text-ink">
                        {item.title}
                      </h3>
                      <p className="text-[12px] text-ink-secondary">
                        {item.by}
                      </p>
                      <p className="text-[13px] text-ink-secondary">
                        {item.why}
                      </p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-11 w-fit items-center gap-1.5 text-[13px] text-brand-accent"
                        >
                          {new URL(item.url).hostname.replace(/^www\./, "")}
                          <ExternalLink aria-hidden="true" size={13} />
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
