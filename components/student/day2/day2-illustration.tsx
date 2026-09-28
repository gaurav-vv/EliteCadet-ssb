// The Day 2 overview hero's single illustration — an open notebook with a
// dotted ascent line rising toward a summit marker, in the same line-art
// language as Day2Visual's category marks (rounded joins, one stroke
// weight) so the whole Day 2 experience reads as one visual family. Reads
// as "your notes become your readiness" — intentional, not stock imagery,
// and purely decorative (aria-hidden).
export function Day2Illustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 220"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="day2-illus-ascent" x1="40" y1="190" x2="260" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-accent)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--brand-accent-2)" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id="day2-illus-wash" x1="0" y1="0" x2="0" y2="220" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-accent)" stopOpacity="0.14" />
          <stop offset="1" stopColor="var(--brand-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ambient wash behind the composition */}
      <circle cx="230" cy="60" r="90" fill="url(#day2-illus-wash)" />

      {/* Notebook */}
      <rect x="46" y="118" width="132" height="86" rx="10" className="stroke-brand-accent" strokeWidth="3" fill="rgba(255,255,255,0.6)" />
      <line x1="70" y1="118" x2="70" y2="204" className="stroke-brand-accent" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
      <line x1="90" y1="140" x2="158" y2="140" className="stroke-ink-secondary" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
      <line x1="90" y1="156" x2="150" y2="156" className="stroke-ink-secondary" strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <line x1="90" y1="172" x2="140" y2="172" className="stroke-ink-secondary" strokeWidth="3" strokeLinecap="round" opacity="0.3" />

      {/* Ascent path rising from the notebook to a summit marker */}
      <path
        d="M104 128 C 130 96 150 108 168 84 S 210 48 246 40"
        stroke="url(#day2-illus-ascent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="1 12"
      />
      <circle cx="104" cy="128" r="4" className="fill-brand-accent" />
      <circle cx="168" cy="84" r="4" className="fill-brand-accent" opacity="0.75" />
      <g className="day2-illus-float">
        <circle cx="246" cy="40" r="6" className="fill-brand-accent-2" />
        <path d="M246 40 L246 22" className="stroke-brand-accent-2" strokeWidth="3" strokeLinecap="round" />
        <path d="M246 22 L262 28 L246 34 Z" className="fill-brand-accent-2" />
      </g>
    </svg>
  );
}
