import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AvailabilityEditor } from "@/components/mentor/sessions/availability-editor";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { removeAvailabilityAction } from "@/lib/actions/sessions";
import { getMyAvailability } from "@/lib/server/sessions/service";
import { WEEKDAYS } from "@/types/sessions";

export const metadata: Metadata = { title: "My availability" };

export default async function AvailabilityPage() {
  const result = await getMyAvailability();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/sessions" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Sessions
      </Link>
      <PageHeader title="My availability" subtitle="When you usually teach each week (IST). Your academy admin can see it; you can still schedule outside it." />
      <div className="glass-regular rounded-card px-5 py-5"><AvailabilityEditor /></div>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your availability. Please try again."} />
      ) : result.data.length === 0 ? (
        <div className="glass-regular rounded-card"><EmptyState icon={<CalendarClock aria-hidden="true" size={22} />} title="No availability yet" description="Add the times you usually teach." /></div>
      ) : (
        <ListPanel>
          {result.data.map((slot) => (
            <ListRow key={slot.id}>
              <span className="text-sm text-ink">{WEEKDAYS[slot.weekday]} · {slot.startTime}–{slot.endTime} IST</span>
              <ConfirmActionDialog triggerLabel="Remove" triggerAriaLabel={`Remove ${WEEKDAYS[slot.weekday]} ${slot.startTime}–${slot.endTime}`} title="Remove this slot?" description="Sessions already scheduled aren't affected." confirmLabel="Remove" destructive action={removeAvailabilityAction.bind(null, slot.id)} />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
