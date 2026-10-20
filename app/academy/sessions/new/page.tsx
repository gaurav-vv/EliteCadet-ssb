import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SessionForm } from "@/components/mentor/sessions/session-form";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyScheduleFormData } from "@/lib/server/sessions/service";

export const metadata: Metadata = { title: "Schedule meeting" };

export default async function AcademyNewMeetingPage() {
  const form = await getAcademyScheduleFormData();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/academy/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      <PageHeader title="Schedule a live meeting" subtitle="One-to-one or the whole batch, hosted by one of the batch's mentors." />
      {!form.ok || !form.data ? (
        <RetryErrorState message={form.error?.message ?? "We couldn't load your batches. Please try again."} />
      ) : (
        <SessionForm batches={form.data.batches} variant="academy" />
      )}
    </div>
  );
}
