import { DAY2_CATEGORY_ACCENT } from "@/lib/day2/categories";
import { getAvailableSections } from "@/lib/day2/sections";
import { Day2FlipCard } from "@/components/student/day2/day2-flip-card";
import type { Day2Resource, Day2TestCategory } from "@/types/day2-resources";

interface Day2SectionPickerProps {
  category: Day2TestCategory;
  resources: Day2Resource[];
  /** e.g. "/student/resources/day-2/tat" — sections link here with a `?do=` query. */
  basePath: string;
}

// Second-level navigation (redesign brief §9–§11): only after picking a test
// does the student choose what they want to do with it, and only sections
// that actually have a matching resource are ever shown — never an invented
// or empty one.
export function Day2SectionPicker({ category, resources, basePath }: Day2SectionPickerProps) {
  const sections = getAvailableSections(resources);
  const accent = DAY2_CATEGORY_ACCENT[category];

  return (
    <section aria-labelledby="day2-section-picker-heading" className="flex flex-col gap-4">
      <h2 id="day2-section-picker-heading" className="text-[18px] font-semibold text-ink">
        What do you want to do?
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, i) => (
          <Day2FlipCard
            key={section.key}
            href={`${basePath}?do=${section.key}`}
            accent={accent}
            size="section"
            animationDelay={i * 90}
            visual={
              <span className="day2-cat-icon flex size-11 items-center justify-center">
                <section.icon aria-hidden="true" size={22} />
              </span>
            }
            eyebrow={`${section.count} resource${section.count === 1 ? "" : "s"}`}
            title={section.label}
            subtitle={section.oneLiner}
            backLabel={section.label}
            backText={section.backText}
            cta={`Explore ${section.label}`}
          />
        ))}
      </div>
    </section>
  );
}
