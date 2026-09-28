import { BookOpen, PenSquare, MessageCircle, ArrowRight } from "lucide-react";

// "Recommended for beginners" — a single slim, highlighted route (Learn →
// Practice → Feedback) rather than a long numbered guide, so the overview
// page stays short. Purely informational; the actual route is walked on
// each category page once a test is picked.
const ROUTE = [
  { label: "Learn", icon: BookOpen },
  { label: "Practice", icon: PenSquare },
  { label: "Feedback", icon: MessageCircle },
];

export function Day2BeginnerPath() {
  return (
    <section aria-labelledby="new-to-day2-heading" className="day2-rise-in glass-thin flex flex-col gap-2 rounded-card px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <h2 id="new-to-day2-heading" className="text-[11px] font-semibold tracking-[0.06em] text-brand-accent uppercase">
        New to Day 2?
      </h2>

      <ol className="flex items-center gap-1.5">
        {ROUTE.map((step, i) => (
          <li key={step.label} className="flex items-center gap-1.5">
            <span className="glass-thin flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-semibold text-ink">
              <step.icon aria-hidden="true" size={13} className="text-brand-accent" />
              {step.label}
            </span>
            {i < ROUTE.length - 1 && <ArrowRight aria-hidden="true" size={12} className="text-ink-secondary/50" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
