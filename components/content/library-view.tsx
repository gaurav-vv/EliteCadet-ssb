import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, ExternalLink, SearchX } from "lucide-react";
import { Pagination } from "@/components/academy/shared/pagination";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { ContentToolbar } from "@/components/admin/content/content-toolbar";
import { CategoryTabs, CategoryTag } from "@/components/content/content-tags";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getLibrary, getLibraryItem } from "@/lib/server/content/service";
import { buildContentQuery, hasActiveContentFilters, parseContentParams } from "@/lib/server/content/validation";
import { formatDay } from "@/lib/utils/format-date";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES } from "@/types/content";

type RawParams = Record<string, string | string[] | undefined>;

// One Library for every reader role. What appears is decided by RLS
// (can_read_content): published, for this role, and visible to everyone or
// assigned to the reader's academy/batch.
export async function LibraryList({ basePath, rawParams, subtitle }: { basePath: string; rawParams: RawParams; subtitle: string }) {
  const params = { ...parseContentParams(rawParams), status: "all" as const };
  const result = await getLibrary(params);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Library" subtitle={subtitle} />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your library. Please try again."} />
      ) : result.data.total === 0 && !hasActiveContentFilters(params) ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<BookOpen aria-hidden="true" size={22} />} title="Nothing here yet" description="Learning material published for you will appear here." />
        </div>
      ) : (
        <section aria-label="Library" className="flex flex-col gap-4">
          <CategoryTabs active={params.category} hrefFor={(c) => `${basePath}${buildContentQuery({ category: c })}`} />
          <ContentToolbar params={params} showStatus={false} />
          {result.data.total === 0 ? (
            <div className="glass-regular rounded-card">
              <EmptyState icon={<SearchX aria-hidden="true" size={22} />} title="Nothing matches your filters" description="Try a different search or clear the filters." action={<Link href={basePath} className="text-[13px] text-brand-accent">Clear filters</Link>} />
            </div>
          ) : (
            <>
              <ListPanel>
                {result.data.rows.map((c) => (
                  <ListRow key={c.id} href={`${basePath}/${c.id}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">{c.title}</p>
                      <p className="truncate text-[13px] text-ink-secondary">
                        {CONTENT_TYPES[c.type]} · {CONTENT_DIFFICULTIES[c.difficulty]}
                        {c.description ? ` · ${c.description}` : ""}
                      </p>
                    </div>
                    <CategoryTag category={c.category} />
                  </ListRow>
                ))}
              </ListPanel>
              <Pagination page={result.data.page} pageCount={result.data.pageCount} pageSize={result.data.pageSize} total={result.data.total} buildHref={(page) => `${basePath}${buildContentQuery({ ...params, page, status: "all" })}`} noun={{ one: "item", many: "items" }} />
            </>
          )}
        </section>
      )}
    </div>
  );
}

export async function LibraryItem({ basePath, id, footer }: { basePath: string; id: string; footer?: React.ReactNode }) {
  const result = await getLibraryItem(id);
  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href={basePath} className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Library
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this item. Please try again."} />
      ) : (
        <article className="flex flex-col gap-4">
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] font-bold text-ink">{result.data.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
              <CategoryTag category={result.data.category} />
              <span>{CONTENT_TYPES[result.data.type]}</span>
              <span>· {CONTENT_DIFFICULTIES[result.data.difficulty]}</span>
              {result.data.publishedAt && <span>· Published {formatDay(result.data.publishedAt)}</span>}
            </div>
            {result.data.description && <p className="text-[15px] text-ink-secondary">{result.data.description}</p>}
          </header>
          {result.data.externalUrl && (
            <a href={result.data.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit min-h-11 items-center gap-2 rounded-button border border-hairline bg-white px-4 text-sm text-ink no-underline hover:bg-black/5">
              <ExternalLink aria-hidden="true" size={16} />
              Open link <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
          {/* Plain text only (never HTML): content can't inject markup. */}
          {result.data.body && <div className="glass-regular rounded-card px-6 py-5 text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{result.data.body}</div>}
          {footer}
        </article>
      )}
    </div>
  );
}
