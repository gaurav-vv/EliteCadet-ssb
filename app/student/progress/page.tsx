import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { ProgressBody, ProgressStats } from "@/components/progress/progress-views";
import { PageHeader } from "@/components/ui/page-header";
import { getMyProgress } from "@/lib/server/progress/service";

export const metadata: Metadata = { title: "Progress" };

export default async function ProgressPage() {
  const result = await getMyProgress(new Date().toISOString());
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="My Progress" subtitle="Built only from mentor-reviewed scores, session attendance and what you've read." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your progress. Please try again."} />
      ) : (
        <>
          <ProgressStats summary={result.data.summary} />
          {result.data.recommendations.length > 0 && (
            <section className="glass-regular rounded-card p-6">
              <h2 className="mb-3 text-[18px] font-semibold text-ink">Next steps</h2>
              <ul className="flex flex-col divide-y divide-hairline">
                {result.data.recommendations.map((r) => (
                  <li key={r.href + r.title}>
                    <Link href={r.href} className="flex min-h-11 items-center justify-between gap-3 py-2 text-[14px]">
                      <span>
                        <span className="block text-ink">{r.title}</span>
                        <span className="block text-[13px] text-ink-secondary">{r.reason}</span>
                      </span>
                      <ArrowRight aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ProgressBody progress={result.data} emptyHint="Submit an assessment — your trend starts once your mentor reviews it." />
        </>
      )}
    </div>
  );
}
