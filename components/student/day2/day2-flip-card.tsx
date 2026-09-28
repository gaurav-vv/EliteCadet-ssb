"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";

// One generic flip card, used both for the five Day 2 test cards on the
// overview page and for each category's "what do you want to do?" section
// cards — same dimensions, same structure, same interaction everywhere
// (AGENTS.md §7 Day 2 exception; see app/globals.css for the flip/accent
// mechanics this relies on).
//
// Flip triggers two ways, deliberately kept independent so neither can break
// the other: plain CSS `:hover` on non-touch devices, and a dedicated info
// button (click, Enter/Space, or tap) that toggles React state — the one
// mechanism that works with a keyboard or a finger. The info button sits
// outside the rotating layer so it stays reachable and visible on both
// faces.
interface Day2FlipCardProps {
  href: string;
  /** CSS custom-property reference, e.g. "var(--day2-tat)" — never a literal colour. */
  accent: string;
  visual: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle: string;
  backLabel: string;
  backText: string;
  cta: string;
  size?: "test" | "section";
  className?: string;
  animationDelay?: number;
}

export function Day2FlipCard({
  href,
  accent,
  visual,
  eyebrow,
  title,
  subtitle,
  backLabel,
  backText,
  cta,
  size = "test",
  className,
  animationDelay,
}: Day2FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const visualHeight = size === "test" ? "h-32" : "h-16";

  return (
    <div
      className={`day2-flip-card day2-rise-in relative ${size === "test" ? "h-[300px]" : "h-[188px]"} ${className ?? ""}`}
      data-flipped={flipped}
      style={{ "--cat-accent": accent, animationDelay: animationDelay ? `${animationDelay}ms` : undefined } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-expanded={flipped}
        aria-label={`What is ${title}?`}
        className="glass-thin day2-cat-icon absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105"
      >
        <Info aria-hidden="true" size={14} />
      </button>

      <div className="day2-flip-inner">
        {/* Front */}
        <div className="day2-flip-face glass-regular day2-cat-hover group flex flex-col overflow-hidden rounded-card border border-transparent">
          <span aria-hidden="true" className="day2-cat-line block h-[3px] w-full shrink-0" />
          <div className={`day2-cat-wash flex ${visualHeight} shrink-0 items-center justify-center overflow-hidden`}>
            <div className="transition-transform duration-300 ease-out group-hover:scale-[1.08]">{visual}</div>
          </div>
          <div className="flex flex-1 flex-col gap-1 px-5 py-4">
            <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
            <p className="text-[12px] leading-snug text-ink-secondary">{subtitle}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-2">
              {eyebrow ? <span className="text-[11px] text-ink-secondary">{eyebrow}</span> : <span />}
              <Link
                href={href}
                className="day2-cat-icon inline-flex items-center gap-1 text-[13px] font-semibold no-underline"
              >
                Explore
                <ArrowRight aria-hidden="true" size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="day2-flip-face day2-flip-face-back glass-regular flex flex-col justify-between rounded-card border border-transparent px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <span className="day2-cat-icon text-[11px] font-semibold tracking-[0.05em] uppercase">What is {backLabel}?</span>
            <p className="text-[13px] leading-relaxed text-ink-secondary">{backText}</p>
          </div>
          <Link href={href} className="day2-cat-icon inline-flex w-fit items-center gap-1 text-[13px] font-semibold no-underline">
            {cta}
            <ArrowRight aria-hidden="true" size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
