import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { SessionForm } from "@/components/mentor/sessions/session-form";
import { PageHeader } from "@/components/ui/page-header";
import { getScheduleFormData } from "@/lib/server/sessions/service";
import { WEEKDAYS } from "@/types/sessions";

export const metadata: Metadata = { title: "Schedule session" };

export default async function NewSessionPage() {
  const form = await getScheduleFormData();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      <PageHeader title="Schedule a session" subtitle="For one of your batches — the whole batch or selected students." />
      {!form.ok || !form.data ? (
        <RetryErrorState message={form.error?.message ?? "We couldn't load your batches. Please try again."} />
      ) : (
        <>
          {form.data.availability.length > 0 && (
            <p className="text-[13px] text-ink-secondary">
              Your availability: {form.data.availability.map((s) => `${WEEKDAYS[s.weekday].slice(0, 3)} ${s.startTime}–${s.endTime}`).join(", ")} (IST)
            </p>
          )}
          <SessionForm batches={form.data.batches} />
        </>
      )}
    </div>
  );
}
