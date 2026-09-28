import { DAY2_CATEGORIES, DAY2_CATEGORY_ACCENT, DAY2_CATEGORY_META, DAY2_CATEGORY_SLUGS } from "@/lib/day2/categories";
import { Day2Visual } from "@/components/student/day2/day2-visual";
import { Day2FlipCard } from "@/components/student/day2/day2-flip-card";
import type { Day2Resource } from "@/types/day2-resources";

interface Day2CategoryGridProps {
  resources: Day2Resource[];
}

// The main navigation surface for Day 2 — five identically-shaped flip
// cards, real counts, nothing else. Hover (or the info toggle, for keyboard
// and touch) reveals a one-line explanation on the back; the front stays a
// fast visual pick. This replaces showing any individual resource on the
// overview page entirely: pick a test here, its resources live on its own
// page.
export function Day2CategoryGrid({ resources }: Day2CategoryGridProps) {
  return (
    <section id="explore-day2-tests" aria-labelledby="explore-day2-tests-heading" className="flex flex-col gap-4">
      <h2 id="explore-day2-tests-heading" className="text-[18px] font-semibold text-ink">
        Choose a Test
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DAY2_CATEGORIES.map((category, i) => {
          const meta = DAY2_CATEGORY_META[category];
          const accent = DAY2_CATEGORY_ACCENT[category];
          const count = resources.filter((r) => r.category === category).length;

          return (
            <Day2FlipCard
              key={category}
              href={`/student/resources/day-2/${DAY2_CATEGORY_SLUGS[category]}`}
              accent={accent}
              size="test"
              animationDelay={i * 90}
              visual={<Day2Visual category={category} size="lg" bare className="day2-cat-icon" />}
              eyebrow={`${count} resource${count === 1 ? "" : "s"}`}
              title={meta.shortLabel}
              subtitle={meta.microLabel}
              backLabel={meta.shortLabel}
              backText={meta.explanation}
              cta={`Explore ${meta.shortLabel}`}
            />
          );
        })}
      </div>
    </section>
  );
}
