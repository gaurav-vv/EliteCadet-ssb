import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import type { RoadmapAction } from "@/types/roadmap";

// Daily Mission (FR-DASH-01): a short ranked list from the roadmap, each
// with the reason it was chosen.
export function TodayMission({ actions, title = "Today's Mission", showLink = true }: { actions: RoadmapAction[]; title?: string; showLink?: boolean }) {
  return (
    <section aria-labelledby="today-mission" className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id="today-mission" className="text-[18px] font-semibold text-ink">
          {title}
        </h2>
        {showLink && (
          <Link href="/student/roadmap" className="text-[13px] text-brand-accent hover:underline">
            Your roadmap
          </Link>
        )}
      </div>
      {actions.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<ListChecks aria-hidden="true" size={22} />} title="Nothing urgent today" description="Keep your streak going with any practice you like." />
        </div>
      ) : (
        <ol className="glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card">
          {actions.map((a, i) => (
            <li key={a.href + a.title}>
              <Link href={a.href} className="row-hover-tint flex min-h-14 items-center gap-4 px-5 py-4 no-underline">
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-[13px] font-semibold text-brand-accent">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{a.title}</span>
                  <span className="block text-[13px] text-ink-secondary">Why: {a.reason}</span>
                </span>
                <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
