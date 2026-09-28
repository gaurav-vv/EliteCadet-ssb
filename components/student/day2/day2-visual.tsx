import type { Day2TestCategory } from "@/types/day2-resources";
import { cn } from "cn";

// One small illustrated scene per Day 2 category — not stock imagery, not a
// reproduction of any copyrighted test material, just a visual metaphor for
// what each test involves. One shared visual language across all five: line
// art with rounded joins, a soft filled shape or two for depth, the same
// stroke weight. Primary strokes/fills use `currentColor` so a wrapping
// element can tint the whole scene with that test's accent (day2-cat-icon),
// never a literal colour baked in here. Purely decorative (aria-hidden), so
// no alt text is needed.

function TatMark() {
  return (
    <>
      {/* Picture frame with a small landscape inside — "observing a scene" */}
      <rect x="8" y="10" width="34" height="26" rx="4" className="stroke-current" strokeWidth="2" fill="none" />
      <circle cx="16" cy="18" r="2.5" className="fill-current" opacity="0.7" />
      <path d="M11 32 L20 22 L27 28 L33 20 L39 32 Z" className="fill-current" opacity="0.16" />
      <path d="M11 32 L20 22 L27 28 L33 20 L39 32" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* Story thread trailing from the frame */}
      <path
        d="M44 24 Q 52 24 54 32 T 58 42"
        className="stroke-ink-secondary"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="0.5 7"
        opacity="0.5"
      />
      <circle cx="58" cy="42" r="2.5" className="fill-ink-secondary" opacity="0.5" />
    </>
  );
}

function WatMark() {
  return (
    <>
      {/* Open notebook page with quick word-lines */}
      <path d="M8 14 L30 11 L30 46 L8 49 Z" className="fill-current" opacity="0.1" />
      <path d="M8 14 L30 11 L30 46 L8 49 Z" className="stroke-current" strokeWidth="2" fill="none" strokeLinejoin="round" />
      <line x1="13" y1="21" x2="25" y2="19.5" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="13" y1="29" x2="25" y2="27.7" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
      <line x1="13" y1="37" x2="20" y2="36.3" className="stroke-current" strokeWidth="2.5" strokeLinecap="round" opacity="0.35" />
      {/* Pen mid-stroke */}
      <path d="M38 16 L52 30" className="stroke-ink-secondary" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
      <path d="M50 28 L55 33 L52 35 L47 30 Z" className="fill-current" opacity="0.7" />
    </>
  );
}

function SrtMark() {
  return (
    <>
      {/* A decision point, forking into two paths — one chosen */}
      <circle cx="30" cy="10" r="3.5" className="fill-current" />
      <path d="M30 14 V 27" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M30 27 L16 45" className="stroke-current" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 27 L44 45" className="stroke-ink-secondary" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="0.5 6" opacity="0.5" />
      <circle cx="44" cy="45" r="2.5" className="fill-ink-secondary" opacity="0.5" />
      {/* Flag marking the chosen path */}
      <path d="M16 45 L16 33" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 33 L26 36.5 L16 40 Z" className="fill-current" opacity="0.8" />
    </>
  );
}

function SdtMark() {
  return (
    <>
      {/* A silhouette and its faint mirrored reflection */}
      <line x1="32" y1="8" x2="32" y2="52" className="stroke-ink-secondary" strokeWidth="1.5" strokeDasharray="1 5" opacity="0.4" />
      <circle cx="21" cy="20" r="8" className="fill-current" opacity="0.85" />
      <path d="M9 46 C 9 34 33 34 33 46 Z" className="fill-current" opacity="0.85" />
      <circle cx="43" cy="20" r="8" className="stroke-current" strokeWidth="2" fill="none" opacity="0.4" />
      <path d="M55 46 C 55 34 31 34 31 46 Z" className="stroke-current" strokeWidth="2" fill="none" opacity="0.4" />
    </>
  );
}

function FullDayMark() {
  return (
    <>
      {/* A checkpointed path from start to a finish flag */}
      <circle cx="6" cy="42" r="3" className="fill-current" />
      <path
        d="M6 42 C 16 20 24 54 32 30 S 44 12 50 26 S 54 34 58 26"
        className="stroke-current"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="32" cy="30" r="2.5" className="fill-current" opacity="0.75" />
      <circle cx="50" cy="26" r="2.5" className="fill-ink-secondary" opacity="0.5" />
      <path d="M58 26 L58 10" className="stroke-current" strokeWidth="2" strokeLinecap="round" />
      <path d="M58 10 L48 13.5 L58 17 Z" className="fill-current" opacity="0.85" />
    </>
  );
}

const MARKS: Record<Day2TestCategory, () => React.JSX.Element> = {
  tat: TatMark,
  wat: WatMark,
  srt: SrtMark,
  sdt: SdtMark,
  "full-day-2": FullDayMark,
};

interface Day2VisualProps {
  category: Day2TestCategory;
  size?: "sm" | "lg" | "xl";
  className?: string;
  /** Skip the glass-thin circular frame — used inside a surface (e.g. a flip card's visual band) that already provides one. */
  bare?: boolean;
}

const DIMENSIONS = { sm: "size-14", lg: "size-24", xl: "size-16" };
const SVG_SIZES = { sm: "size-9", lg: "size-16", xl: "size-11" };

export function Day2Visual({ category, size = "sm", className, bare = false }: Day2VisualProps) {
  const Mark = MARKS[category];

  const svg = (
    <svg viewBox="0 0 64 64" className={SVG_SIZES[size]} fill="none">
      <Mark />
    </svg>
  );

  if (bare) {
    return (
      <span aria-hidden="true" className={cn("inline-flex shrink-0 items-center justify-center", className)}>
        {svg}
      </span>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn("glass-thin flex shrink-0 items-center justify-center rounded-panel", DIMENSIONS[size], className)}
    >
      {svg}
    </div>
  );
}
