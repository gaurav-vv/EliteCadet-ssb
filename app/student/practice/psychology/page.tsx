import type { Metadata } from "next";
import Link from "next/link";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PSYCHOLOGY_ACTIVITIES } from "@/lib/practice/activities";
import { getBankCounts } from "@/lib/server/practice/service";

export const metadata: Metadata = { title: "Psychology" };

export default async function PsychologyPage() {
  // Item counts are the banks' real counts (0014), never a fixed figure.
  const counts = await getBankCounts(PSYCHOLOGY_ACTIVITIES.map((a) => a.testType));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/student/practice" className="text-xs text-brand-accent hover:underline">
          ← Practice
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">Psychology</h1>
        <p className="text-[14px] text-ink-secondary">Four tests, same format as the actual SSB screening. Read the instructions before you start.</p>
      </div>

      <ListPanel>
        {PSYCHOLOGY_ACTIVITIES.map((activity) => (
          <ListRow key={activity.testType} href={`/student/practice/psychology/${activity.testType}`}>
            <span className="text-sm font-medium text-ink">{activity.title}</span>
            <span className="text-xs text-ink-secondary">
              {activity.description} · {counts[activity.testType] ?? 0} items · {activity.durationLabel}
            </span>
          </ListRow>
        ))}
      </ListPanel>
    </div>
  );
}
