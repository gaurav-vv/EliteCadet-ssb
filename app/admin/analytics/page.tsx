import type { Metadata } from "next";
import Link from "next/link";
import { AnalyticsView, WINDOW_LABEL } from "@/components/admin/analytics/analytics-view";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { PageHeader } from "@/components/ui/page-header";
import { getPlatformAnalytics, parseWindow, WINDOWS } from "@/lib/server/analytics/service";
import { cn } from "cn";

export const metadata: Metadata = { title: "Analytics" };

// Platform Analytics (specs.md §8a.4f): Super Admin only — enforced by the
// layout guard, the service and the SQL function itself.
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const window = parseWindow((await searchParams).window);
  const result = await getPlatformAnalytics(window, new Date().toISOString());

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title="Platform Analytics" subtitle="Every academy, from real accounts, sessions, submissions and reviews." />

      <nav aria-label="Time range" className="flex gap-2 overflow-x-auto pb-1">
        {WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/admin/analytics?window=${w}`}
            aria-current={w === window ? "page" : undefined}
            className={cn("inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-[13px] no-underline", w === window ? "border-brand-accent text-brand-accent" : "border-hairline text-ink-secondary hover:text-ink")}
          >
            {WINDOW_LABEL[w]}
          </Link>
        ))}
      </nav>

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load analytics. Please try again."} />
      ) : (
        <AnalyticsView d={result.data} />
      )}
    </div>
  );
}
