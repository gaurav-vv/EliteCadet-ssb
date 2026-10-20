import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { getMyPsychologyHistory } from "@/lib/server/ai/feedback";
import { formatIstDay } from "@/lib/server/sessions/validation";
import { PSYCHOLOGY_ACTIVITIES } from "@/lib/practice/activities";
import { timingFor, timingLabel } from "@/lib/practice/config";
import { getBankCounts, getBankTimings } from "@/lib/server/practice/service";

export const metadata: Metadata = { title: "Psychology" };

export default async function PsychologyPage() {
  // Item counts are the banks' real counts (0014), never a fixed figure.
  const slugs = PSYCHOLOGY_ACTIVITIES.map((a) => a.testType);
  const [counts, timings, history] = await Promise.all([getBankCounts(slugs), getBankTimings(slugs), getMyPsychologyHistory(10)]);

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
              {activity.description} · {counts[activity.testType] ?? 0} items · {timingLabel(timingFor(activity.testType, timings[activity.testType]))}
            </span>
          </ListRow>
        ))}
      </ListPanel>

      {history.ok && history.data && history.data.length > 0 && (
        <section aria-labelledby="recent-tests" className="flex flex-col gap-3">
          <h2 id="recent-tests" className="text-[18px] font-semibold text-ink">Your recent tests</h2>
          <ListPanel>
            {history.data.map((a) => (
              <ListRow key={a.id} href={`/student/practice/psychology/results/${a.id}`}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">{a.title.split(" —")[0]}</span>
                  <span className="text-xs text-ink-secondary">
                    {formatIstDay(a.submittedAt)} · {a.answered} of {a.total} answered
                  </span>
                </span>
                {a.feedback === "ready" && <StatusBadge label="Feedback ready" tone="success" />}
                {a.feedback === "pending" && <StatusBadge label="Feedback coming" tone="info" />}
                {a.feedback === "unavailable" && <StatusBadge label="No AI feedback" tone="neutral" />}
              </ListRow>
            ))}
          </ListPanel>
        </section>
      )}
    </div>
  );
}
