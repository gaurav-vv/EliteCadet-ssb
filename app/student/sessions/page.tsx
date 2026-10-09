import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { SessionFilterTabs } from "@/components/sessions/session-filter-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { getMyStudentSessions } from "@/lib/server/sessions/service";
import { parseSessionFilter } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Sessions" };

// Sessions for the student's batch, or ones they were selected for (RLS).
export default async function StudentSessionsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const filter = parseSessionFilter((await searchParams).view);
  const result = await getMyStudentSessions(filter, new Date().toISOString());
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Sessions" subtitle="Your batch's sessions with your mentors. Times are in IST." />
      <SessionFilterTabs active={filter} hrefFor={(f) => (f === "upcoming" ? "/student/sessions" : `/student/sessions?view=${f}`)} />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your sessions. Please try again."} />
      ) : (
        <SessionAgenda sessions={result.data} show={{ mentor: true, link: true }} empty={filter === "upcoming" ? { title: "No upcoming sessions", description: "When your mentor schedules one, it appears here." } : { title: "Nothing here", description: "Nothing to show for this view." }} />
      )}
    </div>
  );
}
