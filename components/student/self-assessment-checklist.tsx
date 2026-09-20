"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { SELF_ASSESSMENT_TRAITS } from "@/lib/mock/ssb-journey";
import { readSelfAssessment, setSelfAssessmentRating } from "@/lib/student/ssb-journey-progress";

const RATINGS = [1, 2, 3, 4, 5];

export function SelfAssessmentChecklist() {
  // Starts empty (matching SSR) and is filled in after mount — see
  // journey-progress-ring.tsx for why a lazy-initializer localStorage read
  // here would instead risk a hydration mismatch once any trait is rated.
  const [ratings, setRatings] = useState<Record<string, number>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state
    setRatings(readSelfAssessment());
  }, []);

  function rate(trait: string, value: number) {
    setRatings(setSelfAssessmentRating(trait, value));
  }

  const ratedCount = Object.keys(ratings).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-secondary">
        {ratedCount} of {SELF_ASSESSMENT_TRAITS.length} rated — an honest self-check, not a score anyone else sees.
      </p>
      <div className="glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card">
        {SELF_ASSESSMENT_TRAITS.map((trait) => (
          <div key={trait} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-ink">{trait}</span>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label={`Self rating for ${trait}`}>
              {RATINGS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={ratings[trait] === value}
                  onClick={() => rate(trait, value)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-sm font-medium transition-colors",
                    ratings[trait] === value
                      ? "border-brand-accent bg-brand-accent text-brand-accent-fg"
                      : "border-hairline text-ink-secondary hover:border-brand-accent/50",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
