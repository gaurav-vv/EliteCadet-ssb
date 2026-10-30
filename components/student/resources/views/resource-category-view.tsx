import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CATEGORY_ICON,
  CATEGORY_ICON_TONE,
  ResourceListCard,
} from "@/components/student/resources/resource-ui";
import { ResourcesSidebar } from "@/components/student/resources/resources-sidebar";
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_SLUGS,
  categoryFromSlug,
  queryResources,
} from "@/lib/api/resources";
import { resourcesBase, type ResourceAudience } from "@/lib/resources/paths";

type Props = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
};

// One page per Resource Category: description, search within the category,
// every article in it, and the same shortcuts panel as the main page.
export async function ResourceCategoryView({
  audience = "student",
  params,
  searchParams,
}: Props & { audience?: ResourceAudience }) {
  const home = resourcesBase(audience);
  const category = categoryFromSlug((await params).category);
  if (!category) notFound();
  const raw = await searchParams;
  const q = (raw.q ?? "").trim().slice(0, 80);
  const { items, total, hasMore, page } = queryResources({
    q,
    category,
    page: Number(raw.page ?? 1),
  });
  const base = `${home}/category/${CATEGORY_SLUGS[category]}`;
  const Icon = CATEGORY_ICON[category];

  return (
    <div className="grid grid-cols-1 gap-6 pb-10 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        <Link
          href={home}
          className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink"
        >
          <ChevronLeft aria-hidden="true" size={16} />
          All resources
        </Link>

        <header className="flex items-start gap-4">
          <span
            className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${CATEGORY_ICON_TONE[category]}`}
          >
            <Icon aria-hidden="true" size={26} />
          </span>
          <div>
            <h1 className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">
              {category}
            </h1>
            <p className="mt-1 max-w-2xl text-[15px] text-ink-secondary">
              {CATEGORY_DESCRIPTIONS[category]}
            </p>
          </div>
        </header>

        <form action={base} method="get" role="search">
          <label className="relative block max-w-md">
            <span className="sr-only">Search {category}</span>
            <Search
              aria-hidden="true"
              size={16}
              className="absolute top-1/2 left-4 -translate-y-1/2 text-ink-secondary"
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder={`Search ${category.toLowerCase()}…`}
              className="glass-thin h-11 w-full rounded-pill pr-4 pl-11 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            />
          </label>
        </form>

        <p className="text-[13px] text-ink-secondary" aria-live="polite">
          {q
            ? `${total} ${total === 1 ? "match" : "matches"} for “${q}” · `
            : `${total} ${total === 1 ? "article" : "articles"}`}
          {q && (
            <Link href={base} className="text-brand-accent">
              Clear search
            </Link>
          )}
        </p>

        {items.length === 0 ? (
          <div className="glass-regular rounded-card">
            <EmptyState
              icon={<SearchX aria-hidden="true" size={22} />}
              title={`No ${category} resources match “${q}”`}
              description="Try a different word, or browse the whole category."
              action={
                <Link href={base} className="text-[14px] text-brand-accent">
                  Show all {category}
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {items.map((r) => (
                <li key={r.slug}>
                  <ResourceListCard resource={r} audience={audience} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <Link
                href={`${base}?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}
                scroll={false}
                className="glass-regular inline-flex min-h-11 w-fit items-center self-center rounded-button px-5 text-[14px] font-medium text-ink no-underline"
              >
                Load more
              </Link>
            )}
          </>
        )}
      </div>
      <ResourcesSidebar audience={audience} />
    </div>
  );
}
