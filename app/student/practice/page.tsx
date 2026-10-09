import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { ContinueJourneyCard } from "@/components/practice/continue-journey-card";
import { JourneyProgressRing } from "@/components/practice/journey-progress-ring";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { SSB_DAYS } from "@/lib/practice/journey";
import { getMyJourneyProgress } from "@/lib/server/practice/journey-progress";

export const metadata: Metadata = { title: "Practice" };

export default async function PracticePage() {
  const progress = await getMyJourneyProgress();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Practice" subtitle="Your 5-day SSB preparation journey. Answers are saved to your account." />

      {!progress.ok || !progress.data ? (
        <RetryErrorState message={progress.error?.message ?? "We couldn't load your progress. Please try again."} />
      ) : (
        <>
          <div className="glass-regular px-6 py-6">
            <JourneyProgressRing progress={progress.data.overall} />
          </div>
          <ContinueJourneyCard mission={progress.data.mission} />
        </>
      )}

      <ListPanel>
        {SSB_DAYS.map((day) => (
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
