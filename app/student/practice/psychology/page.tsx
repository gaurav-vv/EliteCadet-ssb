import type { Metadata } from "next";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { getActivities } from "@/lib/api/practice";

export const metadata: Metadata = { title: "Psychology" };

export default async function PsychologyPage() {
  const result = await getActivities();

  if (!result.ok || !result.data) {
    return <ErrorState message="We couldn't load the psychology tests. Please try again." />;
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/student/practice" className="text-xs text-brand-accent hover:underline">
          ← Practice
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">Psychology</h1>
        <p className="text-[14px] text-ink-secondary">
          Four tests, same format as the actual SSB screening. Read the instructions before you start.
        </p>
      </div>

      <ListPanel>
        {result.data.map((activity) => (
          <ListRow key={activity.testType} href={`/student/practice/psychology/${activity.testType}`}>
            <span className="text-sm font-medium text-ink">{activity.title}</span>
            <span className="text-xs text-ink-secondary">
              {activity.description} · {activity.durationLabel}
            </span>
          </ListRow>
        ))}
      </ListPanel>
    </div>
  );
}
