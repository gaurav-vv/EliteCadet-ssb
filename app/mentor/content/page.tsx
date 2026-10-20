import type { Metadata } from "next";
import Link from "next/link";
import { FileText, SearchX } from "lucide-react";
import { DataTable } from "@/components/academy/shared/data-table";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { ContentToolbar } from "@/components/admin/content/content-toolbar";
import { CategoryTabs, CategoryTag, ContentStatusTag } from "@/components/content/content-tags";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { getMyContent } from "@/lib/server/content/mentor-service";
import { buildContentQuery, parseContentParams } from "@/lib/server/content/validation";
import { formatDay } from "@/lib/utils/format-date";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES } from "@/types/content";

export const metadata: Metadata = { title: "My Content" };

// A mentor's own teaching material — published only to batches they teach.
export default async function MyContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseContentParams(await searchParams);
  const result = await getMyContent(params);
  const actions = (
    <>
      <Button asChild variant="outline" className="min-h-11"><Link href="/mentor/content/templates">Start from a template</Link></Button>
      <Button asChild variant="outline" className="min-h-11"><Link href="/mentor/content/requests">Request from our team</Link></Button>
    </>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title="My Content"
        subtitle="Teaching material, session templates and exercises you share with your batches."
        primaryAction={<Button asChild className="min-h-11"><Link href="/mentor/content/new">New content</Link></Button>}
        secondaryActions={actions}
      />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your content. Please try again."} />
      ) : result.data.counts.all === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<FileText aria-hidden="true" size={22} />}
            title="You haven't created anything yet"
            description="Start from one of our templates, write your own, or ask our team to create it for you."
            action={<Link href="/mentor/content/templates" className="text-[13px] text-brand-accent">Browse templates</Link>}
          />
        </div>
      ) : (
        <section aria-label="My content" className="flex flex-col gap-4">
          <CategoryTabs active={params.category} counts={result.data.counts} hrefFor={(c) => `/mentor/content${buildContentQuery({ category: c })}`} />
          <ContentToolbar params={params} />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.data.list.total === 0 ? (
              <EmptyState icon={<SearchX aria-hidden="true" size={22} />} title="Nothing matches your filters" description="Try a different search or clear the filters." action={<Link href="/mentor/content" className="text-[13px] text-brand-accent">Clear filters</Link>} />
            ) : (
              <>
                <DataTable
                  caption="My content"
                  rows={result.data.list.rows}
                  getRowKey={(c) => c.id}
                  getRowHref={(c) => `/mentor/content/${c.id}`}
                  columns={[
                    { key: "title", header: "Title", cell: (c) => <span className="text-ink">{c.title}</span> },
                    { key: "category", header: "Category", cell: (c) => <CategoryTag category={c.category} /> },
                    { key: "type", header: "Type", cell: (c) => CONTENT_TYPES[c.type] },
                    { key: "difficulty", header: "Difficulty", cell: (c) => CONTENT_DIFFICULTIES[c.difficulty] },
                    { key: "status", header: "Status", cell: (c) => <ContentStatusTag status={c.status} /> },
                    { key: "source", header: "Source", cell: (c) => (c.templateSourceId ? "From template" : "Your own") },
                    { key: "updated", header: "Updated", cell: (c) => formatDay(c.updatedAt) },
                  ]}
                />
                <Pagination page={result.data.list.page} pageCount={result.data.list.pageCount} pageSize={result.data.list.pageSize} total={result.data.list.total} buildHref={(page) => `/mentor/content${buildContentQuery({ ...params, page })}`} noun={{ one: "item", many: "items" }} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
