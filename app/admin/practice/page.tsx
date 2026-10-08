import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { DataTable } from "@/components/academy/shared/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { listBanksAdmin } from "@/lib/server/practice/service";

export const metadata: Metadata = { title: "Practice Banks" };

// Super Admin: the question banks behind every student's Practice journey
// (0014). One platform-wide set, shared by every academy.
export default async function PracticeBanksPage() {
  const result = await listBanksAdmin();
  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Practice Banks" subtitle="The questions behind the Practice journey and tests, shared by every academy." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load practice banks. Please try again."} />
      ) : (
        <div className="glass-regular rounded-card p-2 sm:p-4">
          <DataTable
            caption="Practice banks"
            rows={result.data}
            getRowKey={(b) => b.slug}
            getRowHref={(b) => `/admin/practice/${b.slug}`}
            columns={[
              { key: "title", header: "Bank", cell: (b) => b.title },
              { key: "kind", header: "Type", cell: (b) => (b.kind === "mcq" ? "Multiple choice" : "Written answer") },
              { key: "active", header: "Questions", cell: (b) => b.active },
              { key: "hidden", header: "Hidden", cell: (b) => (b.inactive > 0 ? b.inactive : <span className="text-ink-secondary">—</span>) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
