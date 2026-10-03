import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Day2Illustration } from "@/components/student/day2/day2-illustration";

// Orientation only. Round 2 of the redesign cut this further: title, a
// three-word tagline, one illustration, one primary action — no
// explanatory sentence, no resource count (AGENTS.md decisions: "if it
// doesn't help the student decide what to click next, remove it").

interface Day2HeroProps {
  quickStartHref: string;
}

export function Day2Hero({ quickStartHref }: Day2HeroProps) {
  return (
    <section
      aria-labelledby="day2-hero-heading"
      className="day2-rise-in glass-regular relative flex flex-col-reverse items-center gap-6 overflow-hidden rounded-panel px-6 py-8 sm:flex-row sm:justify-between sm:px-10 sm:py-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-gradient-to-br from-brand-accent/15 to-brand-accent-2/5 blur-2xl"
      />

      <div className="relative flex max-w-md flex-col gap-3">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-brand-accent uppercase">SSB Day 2</span>
        <h1 id="day2-hero-heading" className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">
          Psychology Tests
        </h1>
        <p className="text-[15px] font-semibold text-ink-secondary">Understand → Practice → Improve</p>

        <Link
          href={quickStartHref}
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-button bg-gradient-to-r from-brand-accent to-brand-accent-2 px-4 py-2.5 text-[13px] font-semibold text-brand-accent-fg no-underline shadow-glow-accent transition-transform duration-200 hover:scale-[1.02]"
        >
          Quick Start
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>

      <Day2Illustration className="relative h-40 w-56 shrink-0 sm:h-48 sm:w-64" />
    </section>
  );
}
