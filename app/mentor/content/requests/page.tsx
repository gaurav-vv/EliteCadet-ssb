import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Inbox } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { CategoryTag } from "@/components/content/content-tags";
import { RequestStatusTag, SettlementTag } from "@/components/content/request-tags";
import { RequestForm } from "@/components/mentor/content/request-form";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cancelRequestAction, respondToQuoteAction } from "@/lib/actions/mentor-content";
import { getMyRequests } from "@/lib/server/content/requests";
import { formatInr } from "@/lib/server/content/validation";
import { formatDay } from "@/lib/utils/format-date";
import { CONTENT_TYPES } from "@/types/content";

export const metadata: Metadata = { title: "Content requests" };

export default async function MyRequestsPage() {
  const result = await getMyRequests();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        My Content
      </Link>
      <PageHeader title="Content requests" subtitle="Ask our team to create content for you. You'll get a quote to accept before any work starts." />
      <RequestForm />
      <section aria-labelledby="requests-heading" className="flex flex-col gap-3">
        <h2 id="requests-heading" className="text-[18px] font-bold text-ink">Your requests</h2>
        {!result.ok || !result.data ? (
          <RetryErrorState message={result.error?.message ?? "We couldn't load your requests. Please try again."} />
        ) : result.data.length === 0 ? (
          <div className="glass-regular rounded-card"><EmptyState icon={<Inbox aria-hidden="true" size={22} />} title="No requests yet" description="Requests you send appear here with their quote and progress." /></div>
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.map((r) => (
              <li key={r.id} className="glass-regular flex flex-col gap-3 rounded-card px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{r.title}</p>
                    <p className="text-[13px] text-ink-secondary">{CONTENT_TYPES[r.type]} · requested {formatDay(r.createdAt)}{r.neededBy ? ` · needed by ${formatDay(r.neededBy)}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3"><CategoryTag category={r.category} /><RequestStatusTag status={r.status} /><SettlementTag settlement={r.settlement} /></div>
                </div>
                {r.quotedFeeInr !== null && (
                  <p className="text-sm text-ink">
                    Quoted fee: <span className="font-semibold">{formatInr(r.quotedFeeInr)}</span>
                    {r.quoteNote ? <span className="text-ink-secondary"> — {r.quoteNote}</span> : null}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {r.status === "quoted" && (
                    <>
                      <ConfirmActionDialog triggerLabel="Accept quote" title="Accept this quote?" description={`Our team will start work. ${r.quotedFeeInr !== null ? formatInr(r.quotedFeeInr) : "The fee"} will be recorded as owed and deducted from your payout by our team — nothing is charged here.`} confirmLabel="Accept quote" action={respondToQuoteAction.bind(null, r.id, true)} />
                      <ConfirmActionDialog triggerLabel="Decline" title="Decline this quote?" description="The request closes. You can send a new one any time." confirmLabel="Decline" destructive action={respondToQuoteAction.bind(null, r.id, false)} />
                    </>
                  )}
                  {(r.status === "requested" || r.status === "quoted") && (
                    <ConfirmActionDialog triggerLabel="Cancel request" title="Cancel this request?" description="It closes and no fee is due." confirmLabel="Cancel request" destructive action={cancelRequestAction.bind(null, r.id)} />
                  )}
                  {r.status === "delivered" && r.deliveredContentId && (
                    <Link href={`/mentor/content/${r.deliveredContentId}`} className="inline-flex min-h-11 items-center text-sm text-brand-accent">Open the delivered content</Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
