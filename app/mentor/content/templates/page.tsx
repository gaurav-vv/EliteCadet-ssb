import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, LayoutTemplate, SearchX } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { ContentToolbar } from "@/components/admin/content/content-toolbar";
import { CategoryTabs, CategoryTag } from "@/components/content/content-tags";
import { CopyTemplateButton } from "@/components/mentor/content/copy-template-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getTemplates } from "@/lib/server/content/mentor-service";
import { buildContentQuery, hasActiveContentFilters, parseContentParams } from "@/lib/server/content/validation";
import { CONTENT_DIFFICULTIES, CONTENT_TYPES } from "@/types/content";

export const metadata: Metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = { ...parseContentParams(await searchParams), status: "all" as const };
  const result = await getTemplates(params);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        My Content
      </Link>
      <PageHeader title="Starter templates" subtitle="Ready-made material from our team. Use one to get an editable copy in My Content." />
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load templates. Please try again."} />
      ) : result.data.total === 0 && !hasActiveContentFilters(params) ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<LayoutTemplate aria-hidden="true" size={22} />} title="No templates yet" description="Our team hasn't published templates yet. You can still write your own or request content." />
        </div>
      ) : (
        <section aria-label="Templates" className="flex flex-col gap-4">
          <CategoryTabs active={params.category} hrefFor={(c) => `/mentor/content/templates${buildContentQuery({ category: c })}`} />
          <ContentToolbar params={params} showStatus={false} />
          {result.data.total === 0 ? (
            <div className="glass-regular rounded-card"><EmptyState icon={<SearchX aria-hidden="true" size={22} />} title="No templates match your filters" description="Try a different search or clear the filters." /></div>
          ) : (
            <ListPanel>
              {result.data.rows.map((t) => (
                <ListRow key={t.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{t.title}</p>
                    <p className="truncate text-[13px] text-ink-secondary">{CONTENT_TYPES[t.type]} · {CONTENT_DIFFICULTIES[t.difficulty]}{t.description ? ` · ${t.description}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <CategoryTag category={t.category} />
                    <CopyTemplateButton templateId={t.id} title={t.title} />
                  </div>
                </ListRow>
              ))}
            </ListPanel>
          )}
        </section>
      )}
    </div>
  );
}
