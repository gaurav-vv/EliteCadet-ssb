import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DAY2_CATEGORY_ACCENT, DAY2_CATEGORY_META } from "@/lib/day2/categories";
import { Day2Visual } from "@/components/student/day2/day2-visual";
import type { Day2TestCategory } from "@/types/day2-resources";

interface Day2CategoryHeroProps {
  category: Day2TestCategory;
}

// Round 2 of the redesign: dropped the paragraph explanation and resource
// count from this header entirely — the explanation already lives on the
// test card's flip-back one screen up, and repeating it here was pure
// redundancy. This header's only job now is "confirm you're on the right
// test" before the section picker below it.
export function Day2CategoryHero({ category }: Day2CategoryHeroProps) {
  const meta = DAY2_CATEGORY_META[category];
  const accent = DAY2_CATEGORY_ACCENT[category];

  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/student/resources/day-2"
        className="day2-cat-icon inline-flex w-fit items-center gap-1 text-xs font-semibold no-underline"
        style={{ "--cat-accent": accent } as React.CSSProperties}
      >
        <ChevronLeft aria-hidden="true" size={14} />
        Day 2
      </Link>

      <section
        aria-labelledby="category-hero-heading"
        className="day2-rise-in day2-cat-wash glass-regular relative flex items-center gap-5 overflow-hidden rounded-panel px-6 py-6 sm:px-10 sm:py-7"
        style={{ "--cat-accent": accent } as React.CSSProperties}
      >
        <span aria-hidden="true" className="day2-cat-line absolute top-0 left-0 h-[3px] w-full" />
        <Day2Visual category={category} size="lg" className="day2-cat-icon" />
        <div className="flex flex-col gap-0.5">
          <h1 id="category-hero-heading" className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">
            {meta.shortLabel}
          </h1>
          <p className="text-[12px] font-medium text-ink-secondary">{meta.fullName}</p>
        </div>
      </section>
    </div>
  );
}
