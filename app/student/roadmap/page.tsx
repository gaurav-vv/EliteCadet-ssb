import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { PageHeader } from "@/components/ui/page-header";
import { getMyRoadmap } from "@/lib/server/roadmap/service";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const result = await getMyRoadmap(new Date().toISOString());
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Your roadmap" subtitle="Where to focus next, worked out from your diagnostic, your readiness profile and your goals." />
      {!result.ok || !result.data ? <RetryErrorState message={result.error?.message ?? "We couldn't build your roadmap. Please try again."} /> : <RoadmapView roadmap={result.data} />}
    </div>
  );
}
