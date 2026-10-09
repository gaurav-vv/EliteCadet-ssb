import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SessionAgenda } from "@/components/sessions/session-agenda";
import { SessionFilterTabs } from "@/components/sessions/session-filter-tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getMySessions } from "@/lib/server/sessions/service";
import { parseSessionFilter } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Sessions" };

export default async function MentorSessionsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const filter = parseSessionFilter((await searchParams).view);
  const result = await getMySessions(filter, new Date().toISOString());

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="Sessions"
        subtitle="Your schedule across your batches. Times are in IST."
        primaryAction={<Button asChild className="min-h-11"><Link href="/mentor/sessions/new">Schedule session</Link></Button>}
        secondaryActions={<Button asChild variant="outline" className="min-h-11"><Link href="/mentor/sessions/availability">My availability</Link></Button>}
      />
      <SessionFilterTabs active={filter} hrefFor={(f) => (f === "upcoming" ? "/mentor/sessions" : `/mentor/sessions?view=${f}`)} />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your sessions. Please try again."} />
      ) : (
        <SessionAgenda
          sessions={result.data}
          show={{ batch: true, link: true }}
          hrefFor={(s) => `/mentor/sessions/${s.id}`}
          empty={filter === "upcoming" ? { title: "Nothing scheduled", description: "Schedule a session for one of your batches." } : { title: "Nothing here", description: filter === "past" ? "Sessions you've run appear here." : "Cancelled sessions appear here." }}
        />
      )}
    </div>
  );
}
