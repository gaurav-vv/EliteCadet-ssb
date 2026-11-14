import Link from "next/link";
import { ArrowRight, ChevronDown, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import {
  CATEGORY_ICON,
  FeaturedResourceCard,
  ResourceListCard,
} from "@/components/student/resources/resource-ui";
import { PhotoCredit } from "@/components/student/resources/resource-photo";
import { ResourcesSidebar } from "@/components/student/resources/resources-sidebar";
import {
  CATEGORY_SLUGS,
  categoryFromSlug,
  getFeaturedResources,
  getPhotoCredits,
  queryResources,
  RESOURCE_SORTS,
} from "@/lib/api/resources";
import { RESOURCE_CATEGORIES, type ResourceCategory } from "@/types/resources";
import { resourcesBase, type ResourceAudience } from "@/lib/resources/paths";

type Params = { q?: string; category?: string; sort?: string; page?: string };

function hrefFor(
  home: string,
  p: {
    q?: string;
    category?: ResourceCategory | null;
    sort?: string;
    page?: number;
  },
  hash = "",
) {
  const s = new URLSearchParams();
  if (p.q) s.set("q", p.q);
  if (p.category) s.set("category", CATEGORY_SLUGS[p.category]);
  if (p.sort && p.sort !== "latest") s.set("sort", p.sort);
  if (p.page && p.page > 1) s.set("page", String(p.page));
  const qs = s.toString();
  return `${home}${qs ? `?${qs}` : ""}${hash}`;
}

const chipClass =
  "filter-chip glass-thin inline-flex min-h-11 flex-1 shrink-0 items-center justify-center gap-1.5 rounded-pill px-3.5 text-[13px] font-medium whitespace-nowrap text-ink-secondary no-underline";

// Student Resources (resources_ref.png): search, category chips, featured
// articles, the rest of the library with sort / Load more, and the Quick
// Links, Popular and Categories panels. Search submits ?q= here (the header
// search, shown on other student pages, does the same). All on the server from
// the URL, so filters and paging are shareable and work without JavaScript.
export async function ResourcesHomeView({
  audience = "student",
  searchParams,
}: {
  audience?: ResourceAudience;
  searchParams: Promise<Params>;
}) {
  const home = resourcesBase(audience);
  const raw = await searchParams;
  const q = (raw.q ?? "").trim().slice(0, 80);
  const category = categoryFromSlug(raw.category);
  const filtered = Boolean(q || category);
  const featured = filtered ? [] : getFeaturedResources(4);
  // Each resource appears once per screen: while Featured is shown, the list
  // below holds the rest of the library (as in resources_ref.png).
  const { items, total, hasMore, page, sort } = queryResources({
    q,
    category,
    sort: raw.sort,
    page: Number(raw.page ?? 1),
    excludeSlugs: featured.map((r) => r.slug),
  });
  const sortLabel = RESOURCE_SORTS.find((s) => s.value === sort)?.label;

  return (
    <div className="flex flex-col gap-6 pb-10">
      {audience === "academy" && (
        <PageHeader
          title="Resources"
          subtitle="Study material the platform provides to students, shown here exactly as students see it."
        />
      )}
      {/* The "Resources" h1 sits in the workspace header on this page, level
          with the profile (searchPageTitle in app/student/layout.tsx), so the
          page opens with search and the category tabs, spanning the whole
          content area; the two columns (library | shortcuts sidebar) start
          below them, side by side. */}
      <div className="flex flex-col gap-3">
        {/* Takes the header search's place on this page: same ?q= flow, keeps
            the chosen category and sort, and starts again from page 1. */}
        <form
          action={home}
          method="get"
          role="search"
          aria-label="Search resources"
          className="w-full"
        >
          <label className="flex h-11 w-full items-center gap-2 rounded-pill border border-hairline bg-white px-4 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25">
            <Search
              aria-hidden="true"
              size={16}
              className="shrink-0 text-ink-secondary"
            />
            <span className="sr-only">Search resources</span>
            <Input
              type="search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder="Search resources, guides, articles…"
              className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
          </label>
          {category && (
            <input
              type="hidden"
              name="category"
              value={CATEGORY_SLUGS[category]}
            />
          )}
          {sort !== "latest" && (
            <input type="hidden" name="sort" value={sort} />
          )}
        </form>

        <nav
          aria-label="Resource categories"
          className="glass-regular w-full overflow-x-auto rounded-card p-1.5"
        >
          <div className="flex w-max min-w-full gap-1.5">
            <Link
              href={hrefFor(home, { q, sort })}
              data-active={!category}
              aria-current={!category ? "page" : undefined}
              className={chipClass}
            >
              All
            </Link>
            {RESOURCE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              return (
                <Link
                  key={c}
                  href={hrefFor(home, { q, category: c, sort })}
                  data-active={category === c}
                  aria-current={category === c ? "page" : undefined}
                  className={chipClass}
                >
                  <Icon aria-hidden="true" size={15} />
                  {c}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {featured.length > 0 && (
            <section
              aria-labelledby="featured-title"
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-3">
                <h2
                  id="featured-title"
                  className="text-[19px] font-semibold text-ink"
                >
                  Featured Resources
                </h2>
                <Link
                  href="#all-resources"
                  className="inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-brand-accent no-underline hover:underline"
                >
                  View all
                  <ArrowRight aria-hidden="true" size={14} />
                </Link>
              </div>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
                {featured.map((r) => (
                  <li key={r.slug}>
                    <FeaturedResourceCard resource={r} audience={audience} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section
            id="all-resources"
            aria-labelledby="all-title"
            className="flex scroll-mt-24 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="all-title"
                  className="text-[19px] font-semibold text-ink"
                >
                  {category ?? (q ? "Search results" : "All Resources")}
                </h2>
                <p
                  className="text-[13px] text-ink-secondary"
                  aria-live="polite"
                >
                  {q
                    ? `${total} ${total === 1 ? "match" : "matches"} for “${q}”`
                    : `${total} ${total === 1 ? "article" : "articles"}${featured.length > 0 ? ` · plus ${featured.length} featured above` : ""}`}
                  {filtered && (
                    <>
                      {" · "}
                      <Link
                        href={`${home}#all-resources`}
                        className="text-brand-accent"
                      >
                        Clear filters
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <details className="group relative">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill px-3 text-[13px] text-ink [&::-webkit-details-marker]:hidden">
                  Sort by: <span className="font-semibold">{sortLabel}</span>
                  <ChevronDown
                    aria-hidden="true"
                    size={15}
                    className="transition-transform group-open:rotate-180"
                  />
                </summary>
                <ul className="glass-thick absolute right-0 z-10 mt-1 flex w-48 flex-col rounded-xl p-1 shadow-md">
                  {RESOURCE_SORTS.map((s) => (
                    <li key={s.value}>
                      <Link
                        href={hrefFor(
                          home,
                          { q, category, sort: s.value },
                          "#all-resources",
                        )}
                        aria-current={s.value === sort ? "true" : undefined}
                        className="row-hover-tint flex min-h-11 items-center rounded-lg px-3 text-[13px] text-ink no-underline aria-[current=true]:font-semibold aria-[current=true]:text-brand-accent"
                      >
                        {s.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </div>

            {items.length === 0 ? (
              <div className="glass-regular rounded-card">
                <EmptyState
                  icon={<SearchX aria-hidden="true" size={22} />}
                  title={
                    q
                      ? `No resources match “${q}”`
                      : "No resources in this category yet"
                  }
                  description="Try a different word or another category."
                  action={
                    <Link href={home} className="text-[14px] text-brand-accent">
                      Show all resources
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
                <p className="text-center text-[12px] text-ink-secondary">
                  Showing {items.length} of {total}
                </p>
                {hasMore && (
                  <Link
                    href={hrefFor(home, { q, category, sort, page: page + 1 })}
                    scroll={false}
                    className="glass-regular inline-flex min-h-11 w-fit items-center self-center rounded-button px-5 text-[14px] font-medium text-ink no-underline"
                  >
                    Load more
                  </Link>
                )}
              </>
            )}
          </section>

          <details className="text-[12px] text-ink-secondary">
            <summary className="inline-flex min-h-11 cursor-pointer items-center">
              Photo credits
            </summary>
            <ul className="flex flex-col gap-1 pb-2">
              {getPhotoCredits().map(({ slug, title, photo }) => (
                <li key={slug}>
                  <Link href={`${home}/${slug}`} className="text-ink-secondary">
                    {title}
                  </Link>
                  {" — "}
                  <PhotoCredit photo={photo} className="text-[12px]" />
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* Two columns (xl+): the sidebar drops by the section-heading row
            (44px + 12px gap) so its first panel lines up with the cards, not
            with the "Featured Resources" / "All Resources" heading. */}
        <ResourcesSidebar audience={audience} className="xl:mt-14" />
      </div>
    </div>
  );
}
