import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssessmentForm } from "@/components/mentor/assessments/assessment-form";
import { PageHeader } from "@/components/ui/page-header";
import { getActor } from "@/lib/server/auth/guard";
import { findMyBatchIds } from "@/lib/server/academy-people/repository";

export const metadata: Metadata = { title: "New assessment" };

export default async function NewAssessmentPage() {
  const actor = await getActor();
  const batches = actor ? await findMyBatchIds(actor.id) : { data: null, error: { code: "unauthorized" } };
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/assessments" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"><ChevronLeft aria-hidden="true" size={16} />Assessments</Link>
      <PageHeader title="New assessment" subtitle="Saved as a draft. Open it when your students should answer." />
      {batches.error || !batches.data ? <RetryErrorState message="We couldn't load your batches. Please try again." /> : <AssessmentForm batches={batches.data} />}
    </div>
  );
}
