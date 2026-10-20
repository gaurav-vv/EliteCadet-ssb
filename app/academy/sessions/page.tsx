import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { SessionFilterTabs } from "@/components/sessions/session-filter-tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademySessions } from "@/lib/server/sessions/service";
import { parseSessionFilter } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Sessions" };

export default async function AcademySessionsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const filter = parseSessionFilter((await searchParams).view);
  const result = await getAcademySessions(filter, new Date().toISOString());
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Sessions"
        subtitle="Every session in your academy, across batches. Times are in IST."
        primaryAction={<Button asChild className="min-h-11"><Link href="/academy/sessions/new">Schedule meeting</Link></Button>}
      />
      <SessionFilterTabs active={filter} hrefFor={(f) => (f === "upcoming" ? "/academy/sessions" : `/academy/sessions?view=${f}`)} />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load sessions. Please try again."} />
      ) : (
        <SessionAgenda sessions={result.data} show={{ batch: true, mentor: true }} hrefFor={(s) => `/academy/sessions/${s.id}`} empty={{ title: "No sessions here", description: "Schedule a live meeting, or wait for your mentors to schedule sessions." }} />
      )}
    </div>
  );
}
