"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PartyPopper } from "lucide-react";
import { navIcons } from "@/components/ui/nav-icons";
import { countDoneForModule } from "@/lib/student/ssb-journey-progress";
import type { ContinueCandidate } from "@/lib/api/ssb-journey";

interface ContinueJourneyCardProps {
  candidates: ContinueCandidate[];
}

interface Target {
  dayNumber: number;
  title: string;
  href: string;
  done: number;
  total: number;
}

function firstIncomplete(candidates: ContinueCandidate[]): Target | "all-done" | null {
  for (const c of candidates) {
    const done = countDoneForModule(c.dayId, c.moduleId, c.itemIds);
    if (done < c.itemIds.length) {
      return { dayNumber: c.dayNumber, title: c.title, href: c.href, done, total: c.itemIds.length };
    }
  }
  return candidates.length > 0 ? "all-done" : null;
}

function ssrSafeDefault(candidates: ContinueCandidate[]): Target | "all-done" | null {
  const first = candidates[0];
  if (!first) return null;
  return { dayNumber: first.dayNumber, title: first.title, href: first.href, done: 0, total: first.itemIds.length };
}

// Mirrors the dashboard's "Today's Mission" card (app/student/page.tsx) for
// visual consistency, rather than inventing a new card style. Starts at the
// SSR-safe default (the very first practice module, 0 done — what a
// fresh/no-progress render would correctly show) and is replaced after
// mount with the real first-incomplete module. Reading localStorage
// synchronously here (even via a useState lazy initializer) would return a
// different value on the client's hydration render than the server saw,
// producing a text hydration mismatch — same fix as journey-progress-ring.tsx.
export function ContinueJourneyCard({ candidates }: ContinueJourneyCardProps) {
  const [target, setTarget] = useState<Target | "all-done" | null>(() => ssrSafeDefault(candidates));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe external-store (localStorage) read, not derived state
    setTarget(firstIncomplete(candidates));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on mount; `candidates` is a fresh array from the server each render
  }, []);

  if (!target) return null;

  if (target === "all-done") {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Continue where you left off</h2>
        <div className="glass-regular flex items-center gap-4 rounded-card px-6 py-5">
          <span className="glass-thin flex size-11 shrink-0 items-center justify-center rounded-full text-success">
            <PartyPopper aria-hidden="true" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Every practice bank is done</span>
            <span className="block text-[13px] text-ink-secondary">Revisit any day to keep sharpening, or check your final progress.</span>
          </span>
        </div>
      </section>
    );
  }

  const MissionIcon = navIcons.mission;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[18px] font-semibold text-ink">Continue where you left off</h2>
      <Link
        href={target.href}
        className="glass-hover-lift glass-regular flex items-center gap-4 rounded-card px-6 py-5 no-underline"
      >
        <span className="glass-thin flex size-11 shrink-0 items-center justify-center rounded-full text-brand-accent">
          <MissionIcon aria-hidden="true" size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink">
            Day {target.dayNumber} — {target.title}
          </span>
          <span className="block text-[13px] text-ink-secondary">
            {target.done > 0 ? `${target.done} of ${target.total} done — pick up where you stopped.` : "Start here."}
          </span>
        </span>
        <ArrowRight aria-hidden="true" size={18} className="shrink-0 text-brand-accent" />
      </Link>
    </section>
  );
}
