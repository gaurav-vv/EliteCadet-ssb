import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { DAY2_CATEGORY_ACCENT, DAY2_CATEGORY_ICONS, DAY2_CATEGORY_META } from "@/lib/day2/categories";
import type { Day2TestCategory } from "@/types/day2-resources";

const SEQUENCE: Day2TestCategory[] = ["tat", "wat", "srt", "sdt"];

// Full Day 2's own special treatment (redesign brief §17) — the four-test
// chain it combines, then one primary CTA straight into practice. Shown only
// on the Full Day 2 category page, above the normal section picker.
export function Day2FullDayBanner({ practiceHref }: { practiceHref: string }) {
  return (
    <section aria-labelledby="day2-fullday-heading" className="day2-rise-in glass-regular day2-cat-wash flex flex-col gap-4 rounded-panel px-6 py-6 sm:px-8" style={{ "--cat-accent": DAY2_CATEGORY_ACCENT["full-day-2"] } as React.CSSProperties}>
      <h2 id="day2-fullday-heading" className="day2-cat-icon text-[11px] font-semibold tracking-[0.06em] uppercase">
        The complete sequence
      </h2>

      <div className="flex flex-wrap items-center gap-2">
        {SEQUENCE.map((category, i) => {
          const Icon = DAY2_CATEGORY_ICONS[category];
          const meta = DAY2_CATEGORY_META[category];
          return (
            <span key={category} className="flex items-center gap-2">
              <span className="day2-cat-icon flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                <Icon aria-hidden="true" size={15} />
                {meta.shortLabel}
              </span>
              {i < SEQUENCE.length - 1 && <ArrowRight aria-hidden="true" size={13} className="text-ink-secondary/50" />}
            </span>
          );
        })}
        <Plus aria-hidden="true" size={13} className="text-ink-secondary/50" />
        <span className="text-[13px] font-semibold text-ink">Personal Interview</span>
      </div>

      <Link
        href={practiceHref}
        className="inline-flex w-fit items-center gap-1.5 rounded-button bg-gradient-to-r from-brand-accent to-brand-accent-2 px-4 py-2.5 text-[13px] font-semibold text-brand-accent-fg no-underline shadow-glow-accent transition-transform duration-200 hover:scale-[1.02]"
      >
        Start Full Day 2
        <ArrowRight aria-hidden="true" size={14} />
      </Link>
    </section>
  );
}
