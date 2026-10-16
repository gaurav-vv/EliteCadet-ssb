import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { RequestStaffActions } from "@/components/admin/content/request-staff-actions";
import { CategoryTag } from "@/components/content/content-tags";
import { RequestStatusTag, SettlementTag } from "@/components/content/request-tags";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "cn";
import { markSettledAction, startRequestAction } from "@/lib/actions/content";
import { getAllRequests } from "@/lib/server/content/requests";
import { getPlatformContentOptions } from "@/lib/server/content/service";
import { formatInr } from "@/lib/server/content/validation";
import { formatDay } from "@/lib/utils/format-date";
import { CONTENT_TYPES } from "@/types/content";

export const metadata: Metadata = { title: "Content requests" };

const FILTERS = [
  ["all", "All"],
  ["requested", "New"],
  ["quoted", "Quote sent"],
  ["accepted", "Accepted"],
  ["in_progress", "In progress"],
  ["delivered", "Delivered"],
  ["owed", "Fee owed"],
] as const;

export default async function ContentRequestsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const active = FILTERS.some(([v]) => v === status) ? status : "all";
  const [result, options] = await Promise.all([getAllRequests(active), getPlatformContentOptions()]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Content requests" subtitle="Mentors asking our team to create content. Fees are recorded here and settled outside the app." />
      <nav aria-label="Filter requests" className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([value, label]) => (
          <Link key={value} href={value === "all" ? "/admin/content-requests" : `/admin/content-requests?status=${value}`} aria-current={value === active ? "page" : undefined}
            className={cn("inline-flex min-h-11 shrink-0 items-center rounded-pill border px-4 text-[13px] no-underline", value === active ? "border-brand-accent text-brand-accent" : "border-hairline text-ink-secondary hover:text-ink")}>
            {label}
          </Link>
        ))}
      </nav>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load requests. Please try again."} />
      ) : result.data.length === 0 ? (
        <div className="glass-regular rounded-card"><EmptyState icon={<Inbox aria-hidden="true" size={22} />} title="No requests here" description="Mentors' requests for content appear here." /></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {result.data.map((r) => (
            <li key={r.id} className="glass-regular flex flex-col gap-3 rounded-card px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{r.title}</p>
                  <p className="text-[13px] text-ink-secondary">
                    {r.mentorName || "A mentor"}{r.academyName ? ` (${r.academyName})` : ""} · {CONTENT_TYPES[r.type]} · {formatDay(r.createdAt)}{r.neededBy ? ` · needed by ${formatDay(r.neededBy)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3"><CategoryTag category={r.category} /><RequestStatusTag status={r.status} /><SettlementTag settlement={r.settlement} /></div>
              </div>
              <p className="text-[14px] whitespace-pre-wrap text-ink">{r.details}</p>
              {r.quotedFeeInr !== null && <p className="text-sm text-ink">Fee: <span className="font-semibold">{formatInr(r.quotedFeeInr)}</span>{r.quoteNote ? <span className="text-ink-secondary"> — {r.quoteNote}</span> : null}</p>}
              <RequestStaffActions requestId={r.id} status={r.status} currentFee={r.quotedFeeInr} contentOptions={options.data ?? []} />
              <div className="flex flex-wrap gap-3">
                {r.status === "accepted" && <ConfirmActionDialog triggerLabel="Mark in progress" title="Start work on this request?" description="The mentor sees it as in progress." confirmLabel="Mark in progress" action={startRequestAction.bind(null, r.id)} />}
                {r.settlement === "owed" && (
                  <ConfirmActionDialog triggerLabel="Mark fee settled" title="Mark this fee as settled?" description={`Confirm ${r.quotedFeeInr !== null ? formatInr(r.quotedFeeInr) : "the fee"} has been deducted from ${r.mentorName || "the mentor"}'s payout or invoiced outside the app.`} confirmLabel="Mark settled" action={markSettledAction.bind(null, r.id)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
