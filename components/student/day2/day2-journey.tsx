import Link from "next/link";
import { DAY2_CATEGORY_ACCENT, DAY2_CATEGORY_ICONS, DAY2_CATEGORY_META, DAY2_CATEGORY_SLUGS } from "@/lib/day2/categories";
import type { Day2TestCategory } from "@/types/day2-resources";

const SEQUENCE: Day2TestCategory[] = ["tat", "wat", "srt", "sdt", "full-day-2"];

function JourneyNode({ category, delay }: { category: Day2TestCategory; delay: number }) {
  const Icon = DAY2_CATEGORY_ICONS[category];
  const meta = DAY2_CATEGORY_META[category];
  const accent = DAY2_CATEGORY_ACCENT[category];
  const isCombo = category === "full-day-2";

  return (
    <Link
      href={`/student/resources/day-2/${DAY2_CATEGORY_SLUGS[category]}`}
      className="day2-rise-in day2-cat-hover group relative flex flex-1 flex-col items-center gap-1.5 rounded-control border border-transparent px-2 py-2 text-center no-underline"
      style={{ "--cat-accent": accent, animationDelay: `${delay}ms` } as React.CSSProperties}
    >
      <span
        className="day2-cat-wash day2-cat-icon relative z-10 flex size-10 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105"
        style={isCombo ? { boxShadow: "var(--shadow-glow-accent)" } : undefined}
      >
        <Icon aria-hidden="true" size={17} />
      </span>
      <span className="text-[13px] font-semibold text-ink">{meta.shortLabel}</span>
      <span className="text-[11px] leading-snug text-ink-secondary">{meta.microLabel}</span>
    </Link>
  );
}

export function Day2Journey() {
  return (
    <section aria-labelledby="day2-journey-heading" className="flex flex-col gap-3">
      <h2 id="day2-journey-heading" className="text-[13px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
        The Day 2 Journey
      </h2>

      <div className="relative flex items-start gap-1 overflow-x-auto pb-1 sm:gap-2 sm:overflow-visible">
        <span
          aria-hidden="true"
          className="absolute top-[26px] right-8 left-8 hidden h-px bg-gradient-to-r from-day2-tat via-day2-srt to-day2-full opacity-30 sm:block"
        />
        {SEQUENCE.map((category, i) => (
          <JourneyNode key={category} category={category} delay={i * 100} />
        ))}
      </div>
    </section>
  );
}
