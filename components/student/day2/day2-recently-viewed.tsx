"use client";

import { useSyncExternalStore } from "react";
import { ExternalLink } from "lucide-react";
import { DAY2_CATEGORY_ACCENT, DAY2_CATEGORY_META } from "@/lib/day2/categories";
import {
  getRecentlyViewedServerSnapshot,
  getRecentlyViewedSnapshot,
  subscribeToRecentlyViewed,
} from "@/lib/day2/recently-viewed";

// Small premium touch (redesign brief §19, Feature 2): a per-browser trail
// of resources this student actually opened. Reads localStorage via
// useSyncExternalStore rather than a lazy useState initializer — the server
// can only ever render "nothing yet", so a returning student whose browser
// already has entries needs a render path that reconciles cleanly with that
// server output instead of mismatching it during hydration.
export function Day2RecentlyViewed() {
  const entries = useSyncExternalStore(
    subscribeToRecentlyViewed,
    getRecentlyViewedSnapshot,
    getRecentlyViewedServerSnapshot,
  );

  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="day2-recent-heading" className="day2-rise-in flex flex-col gap-2">
      <h2 id="day2-recent-heading" className="text-[11px] font-semibold tracking-[0.06em] text-ink-secondary uppercase">
        Recently viewed
      </h2>
      <div className="flex flex-wrap gap-2">
        {entries.map((entry) => {
          const meta = DAY2_CATEGORY_META[entry.category];
          const accent = DAY2_CATEGORY_ACCENT[entry.category];
          return (
            <a
              key={entry.id}
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="day2-cat-hover glass-thin inline-flex max-w-full items-center gap-2 rounded-pill border border-transparent px-3.5 py-2 text-[12px] text-ink no-underline"
              style={{ "--cat-accent": accent } as React.CSSProperties}
            >
              <span className="day2-cat-line size-1.5 shrink-0 rounded-full" aria-hidden="true" />
              <span className="truncate font-medium">{entry.name}</span>
              <span className="shrink-0 text-ink-secondary">{meta.shortLabel}</span>
              <ExternalLink aria-hidden="true" size={11} className="shrink-0 text-ink-secondary" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
