import Link from "next/link";
import { ChevronLeft, Newspaper, Search } from "lucide-react";
import { formatCheckedAt, NewsCategoryBadge } from "@/components/student/latest-news-panel";
import { NewsThumbnail } from "@/components/student/news-thumbnail";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatNewsDate, getNewsFeed, queryFeed } from "@/lib/api/news";
import type { NewsArticle, NewsCategory } from "@/types/news";

export const NEWS_CATEGORIES: { value: NewsCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Defence News", label: "Defence News" },
  { value: "Exam Update", label: "Exam Updates" },
  { value: "Current Affairs", label: "Current Affairs" },
  { value: "SSB Preparation", label: "SSB Preparation" },
];

export type NewsBrowserParams = { category?: string; q?: string; page?: string };

interface NewsBrowserProps {
  basePath: string;
  params: NewsBrowserParams;
  title: string;
  subtitle: string;
  back: { href: string; label: string };
  // Daily Current Affairs groups stories under their publication date.
  groupByDate?: boolean;
}

function NewsRow({ a }: { a: NewsArticle }) {
  return (
    <Link href={`/student/news/${a.id}`} className="row-hover-tint flex gap-4 px-4 py-4 no-underline sm:px-5">
      <NewsThumbnail article={a} className="h-[72px] w-[104px] sm:h-[84px] sm:w-[128px]" sizes="128px" />
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-secondary">
          <NewsCategoryBadge category={a.category} />
          <span>{a.source}</span>
          {a.date ? <time dateTime={a.date}>{formatNewsDate(a.date)}</time> : <span>Date not listed by source</span>}
          {a.lang === "hi" && <span lang="hi">हिन्दी</span>}
        </span>
        <span lang={a.lang} className="text-[15px] leading-snug font-semibold text-ink">
          {a.title}
        </span>
        {a.summary && (
          <span lang={a.lang} className="line-clamp-2 text-[13px] text-ink-secondary">
            {a.summary}
          </span>
        )}
      </span>
    </Link>
  );
}

function dayHeading(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

// The full official feed (lib/api/news.ts, cached): categories, search and
// "Load more", rendered on the server from the URL. Used by /student/news and
// /student/resources/current-affairs; every item opens in the in-app reader.
export async function NewsBrowser({ basePath, params, title, subtitle, back, groupByDate = false }: NewsBrowserProps) {
  const category = NEWS_CATEGORIES.some((c) => c.value === params.category) ? (params.category as NewsCategory) : "all";
  const q = (params.q ?? "").trim().slice(0, 80);
  const { feed, failedSources, fetchedAt } = await getNewsFeed();
  const { items, total, hasMore, page } = queryFeed(feed, { category, q, page: Number(params.page ?? 1) });
  const counts = Object.fromEntries(NEWS_CATEGORIES.map((c) => [c.value, c.value === "all" ? feed.length : feed.filter((a) => a.category === c.value).length]));
  const allDown = feed.length === 0 && failedSources.length > 0;
  // Hide categories no source currently fills (except the active one).
  const chips = NEWS_CATEGORIES.filter((c) => c.value === "all" || c.value === category || counts[c.value] > 0);

  const hrefFor = (p: { category: string; q: string; page?: number }) => {
    const s = new URLSearchParams();
    if (p.category !== "all") s.set("category", p.category);
    if (p.q) s.set("q", p.q);
    if (p.page && p.page > 1) s.set("page", String(p.page));
    const qs = s.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  // Group consecutive items by publication date; undated notices last.
  const groups: { key: string; label: string; items: NewsArticle[] }[] = [];
  for (const a of items) {
    const key = groupByDate ? (a.date ?? "undated") : "all";
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(a);
    else groups.push({ key, label: key === "undated" ? "Official notices (date not listed by the source)" : key === "all" ? "" : dayHeading(key), items: [a] });
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href={back.href} className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        {back.label}
      </Link>
      <PageHeader title={title} subtitle={subtitle} />

      <form action={basePath} method="get" role="search" className="flex flex-col gap-3">
        {category !== "all" && <input type="hidden" name="category" value={category} />}
        <label className="relative block max-w-md">
          <span className="sr-only">Search news</span>
          <Search aria-hidden="true" size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-secondary" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={80}
            placeholder="Search news…"
            className="glass-thin h-11 w-full rounded-pill pr-4 pl-10 text-[14px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          />
        </label>
        <nav aria-label="News categories" className="flex gap-2 overflow-x-auto pb-1">
          {chips.map((c) => (
            <Link
              key={c.value}
              href={hrefFor({ category: c.value, q })}
              aria-current={c.value === category ? "page" : undefined}
              data-active={c.value === category}
              className="filter-chip glass-thin inline-flex min-h-11 shrink-0 items-center rounded-pill px-3.5 text-[13px] font-medium whitespace-nowrap text-ink-secondary no-underline"
            >
              {c.label} ({counts[c.value]})
            </Link>
          ))}
        </nav>
      </form>

      <p className="text-[12px] text-ink-secondary">
        Dates shown are each item&apos;s publication date as given by the source. Sources last checked {formatCheckedAt(fetchedAt)} IST; refreshed hourly.
      </p>

      {failedSources.length > 0 && !allDown && (
        <p role="status" className="text-[13px] text-ink-secondary">
          Couldn&apos;t reach {failedSources.join(" and ")} just now; showing the rest.
        </p>
      )}

      {items.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Newspaper aria-hidden="true" size={22} />}
            title={allDown ? "News sources are unavailable" : q ? `No news matches “${q}”` : "No news in this category yet"}
            description={
              allDown
                ? "We couldn't reach the official sources. Please try again in a little while."
                : q
                  ? "Try a different word, or clear the search."
                  : "Our official sources haven't published anything for this category recently."
            }
            action={
              (q || category !== "all") && !allDown ? (
                <Link href={basePath} className="text-[14px] text-brand-accent">
                  Show all news
                </Link>
              ) : undefined
            }
          />
        </div>
      ) : (
        <section aria-label={`${total} news ${total === 1 ? "item" : "items"}`} className="flex flex-col gap-3">
          <p className="text-[13px] text-ink-secondary" aria-live="polite">
            Showing {items.length} of {total}
          </p>
          {groups.map((g) => (
            <div key={g.key} className="flex flex-col gap-2">
              {g.label && <h2 className="pt-2 text-[13px] font-semibold text-ink">{g.label}</h2>}
              <ul className="glass-regular flex flex-col divide-y divide-hairline overflow-hidden rounded-card">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <NewsRow a={a} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {hasMore && (
            <Link
              href={hrefFor({ category, q, page: page + 1 })}
              scroll={false}
              className="glass-regular inline-flex min-h-11 w-fit items-center self-center rounded-button px-5 text-[14px] font-medium text-ink no-underline"
            >
              Load more
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
