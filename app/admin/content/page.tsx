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
import { getContentLibrary } from "@/lib/server/content/service";
import { buildContentQuery, parseContentParams } from "@/lib/server/content/validation";
import { formatDay } from "@/lib/utils/format-date";
import { CONTENT_AUDIENCES, CONTENT_DIFFICULTIES, CONTENT_TYPES } from "@/types/content";

export const metadata: Metadata = { title: "Content Library" };

export default async function ContentLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = parseContentParams(await searchParams);
  const result = await getContentLibrary(params);
  const addButton = (
    <Button asChild className="min-h-11">
      <Link href="/admin/content/new">Add content</Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-10 lg:gap-8">
      <PageHeader title="Content Library" subtitle="Global learning content for students and mentors across the platform." primaryAction={addButton} />

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load content. Please try again."} />
      ) : result.data.counts.all === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<FileText aria-hidden="true" size={22} />} title="No content yet" description="Add your first piece of content. It starts as a draft until you publish it." />
        </div>
      ) : (
        <section aria-label="Content list" className="flex flex-col gap-4">
          <CategoryTabs active={params.category} counts={result.data.counts} hrefFor={(c) => `/admin/content${buildContentQuery({ category: c })}`} />
          <ContentToolbar params={params} />
          <div className="glass-regular rounded-card p-2 sm:p-4">
            {result.data.list.total === 0 ? (
              <EmptyState icon={<SearchX aria-hidden="true" size={22} />} title="No content matches your filters" description="Try a different search or clear the filters." action={<Link href="/admin/content" className="text-[13px] text-brand-accent">Clear filters</Link>} />
            ) : (
              <>
                <DataTable
                  caption="Content"
                  rows={result.data.list.rows}
                  getRowKey={(c) => c.id}
                  getRowHref={(c) => `/admin/content/${c.id}`}
                  columns={[
                    { key: "title", header: "Title", cell: (c) => <span className="text-ink">{c.title}</span> },
                    { key: "category", header: "Category", cell: (c) => <CategoryTag category={c.category} /> },
                    { key: "type", header: "Type", cell: (c) => CONTENT_TYPES[c.type] },
                    { key: "difficulty", header: "Difficulty", cell: (c) => CONTENT_DIFFICULTIES[c.difficulty] },
                    { key: "status", header: "Status", cell: (c) => <ContentStatusTag status={c.status} /> },
                    { key: "for", header: "For", cell: (c) => CONTENT_AUDIENCES[c.targetRole] },
                    { key: "updated", header: "Updated", cell: (c) => formatDay(c.updatedAt) },
                  ]}
                />
                <Pagination page={result.data.list.page} pageCount={result.data.list.pageCount} pageSize={result.data.list.pageSize} total={result.data.list.total} buildHref={(page) => `/admin/content${buildContentQuery({ ...params, page })}`} noun={{ one: "item", many: "items" }} />
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
