import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { JourneyProgressRing } from "@/components/practice/journey-progress-ring";
import { ContinueJourneyCard } from "@/components/practice/continue-journey-card";
import { getAllBankModuleItemIds, getContinueCandidates, getDays } from "@/lib/api/ssb-journey";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage() {
  const daysResult = await getDays();
  const days = daysResult.data ?? [];
  const bankModules = getAllBankModuleItemIds();
  const continueCandidates = getContinueCandidates();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Practice" subtitle="Your 5-day SSB preparation journey." />

      <div className="glass-regular px-6 py-6">
        <JourneyProgressRing modules={bankModules} />
      </div>

      <ContinueJourneyCard candidates={continueCandidates} />

      <ListPanel>
        {days.map((day) => (
          <ListRow key={day.id} href={`/student/practice/${day.id}`}>
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">
                Day {day.dayNumber} — {day.title}
              </span>
              <span className="text-xs text-ink-secondary">{day.description}</span>
            </span>
          </ListRow>
        ))}
      </ListPanel>
    </div>
  );
}
