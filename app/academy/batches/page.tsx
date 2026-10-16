import type { Metadata } from "next";
import Link from "next/link";
import { Layers, SearchX } from "lucide-react";
import { BatchStats } from "@/components/academy/batches/batch-stats";
import { BatchTable } from "@/components/academy/batches/batch-table";
import { BatchToolbar } from "@/components/academy/batches/batch-toolbar";
import { CreateBatchDialog } from "@/components/academy/batches/batch-form-dialog";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getBatchList, getBatchMentorOptions, getBatchSummary } from "@/lib/api/batches";
import { buildBatchListHref, parseBatchListParams } from "@/lib/academy/batch-list";

export const metadata: Metadata = { title: "Batches" };

export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseBatchListParams(await searchParams);

  // Three independent reads (page of batches, whole-academy counts, mentors),
  // all real Postgres queries run in parallel.
  const [listResult, summaryResult, mentorsResult] = await Promise.all([
    getBatchList(params),
    getBatchSummary(),
    getBatchMentorOptions(),
  ]);

  const failure = [listResult, summaryResult, mentorsResult].find((r) => !r.ok || !r.data)?.error;
  if (failure || !listResult.data || !summaryResult.data || !mentorsResult.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Batches" subtitle="Manage academy batches, students and mentors." />
        <RetryErrorState message={failure?.message ?? "We couldn't load your batches. Please try again."} />
      </div>
    );
  }

  const result = listResult.data;
  const summary = summaryResult.data;
  const mentors = mentorsResult.data;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Batches"
        subtitle="Manage academy batches, students and mentors."
        primaryAction={<CreateBatchDialog />}
      />

      <BatchStats summary={summary} />

      {summary.total === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Layers aria-hidden="true" size={22} />}
            title="No batches yet"
            description="Create your first batch to start organising students under a mentor."
            action={<CreateBatchDialog variant="inline" />}
          />
        </div>
      ) : (
        <section aria-label="Batch list" className="flex flex-col gap-4">
          <BatchToolbar params={params} mentors={mentors} />

          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.total === 0 ? (
              <EmptyState
                icon={<SearchX aria-hidden="true" size={22} />}
                title="No batches match your filters"
                description="Try a different search or clear the filters."
                action={
                  <Link href="/academy/batches" className="text-[13px] font-medium text-brand-accent hover:underline">
                    Clear filters
                  </Link>
                }
              />
            ) : (
              <BatchTable rows={result.rows} />
            )}
            <Pagination
              page={result.page}
              pageCount={result.pageCount}
              pageSize={result.pageSize}
              total={result.total}
              buildHref={(page) => buildBatchListHref({ ...params, page })}
              noun={{ one: "batch", many: "batches" }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
