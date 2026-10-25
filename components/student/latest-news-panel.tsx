import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { NewsThumbnail } from "@/components/student/news-thumbnail";
import { formatNewsDate } from "@/lib/api/news";
import type { NewsArticle } from "@/types/news";

const BADGE: Record<NewsArticle["category"], string> = {
  "Official Update": "bg-rose-50 text-rose-700",
  "Exam Update": "bg-rose-50 text-rose-700",
  "Defence News": "bg-emerald-50 text-emerald-700",
  "Current Affairs": "bg-amber-50 text-amber-700",
  "SSB Preparation": "bg-indigo-50 text-indigo-700",
  Article: "bg-sky-50 text-sky-700",
};

// Category label (text, never colour alone) — shared with /student/news.
export function NewsCategoryBadge({ category }: { category: NewsArticle["category"] }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[category]}`}>{category}</span>;
}

// The newest items of the official feed (lib/api/news.ts) and a way to the
// full list. Each item opens inside EliteCadet (/student/news/[id]).
// "Checked 6:47 pm" — when the sources were last fetched, never a publication date.
export function formatCheckedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

export function LatestNewsPanel({ articles, totalCount = articles.length, unavailable = false, fetchedAt }: { articles: NewsArticle[]; totalCount?: number; unavailable?: boolean; fetchedAt?: string }) {
  return (
    <aside aria-labelledby="latest-news-title" className="glass-regular flex flex-col gap-1 rounded-card p-5">
      <h2 id="latest-news-title" className="text-[18px] font-semibold text-ink">
        Latest Articles &amp; News
      </h2>
      {articles.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <Newspaper aria-hidden="true" size={20} className="text-ink-secondary" />
          <p className="text-[14px] font-semibold text-ink">{unavailable ? "News sources are unavailable" : "No new defence updates"}</p>
          <p className="text-[13px] text-ink-secondary">
            {unavailable ? "We couldn't reach the official sources just now. Please check back soon." : "New official releases appear here as they're published."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5">
          {articles.map((a) => (
            <li key={a.id}>
              <Link href={`/student/news/${a.id}`} className="flex gap-3 py-2.5 no-underline hover:opacity-80">
                <NewsThumbnail article={a} className="h-[60px] w-[84px]" sizes="84px" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-secondary">
                    <NewsCategoryBadge category={a.category} />
                    {a.date && <time dateTime={a.date}>{formatNewsDate(a.date)}</time>}
                    {a.lang === "hi" && <span lang="hi">हिन्दी</span>}
                  </span>
                  <span lang={a.lang} className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">
                    {a.title}
                  </span>
                  <span className="text-[11px] text-ink-secondary">
                    {a.source}
                    {!a.date && " · Date not listed by source"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {unavailable && articles.length > 0 && <p className="text-[11px] text-ink-secondary">Some sources couldn&apos;t be reached; showing what loaded.</p>}
      {totalCount > 0 && (
        <Link href="/student/news" className="inline-flex min-h-11 w-fit items-center gap-1 text-[13px] font-medium text-brand-accent no-underline hover:underline">
          View all news ({totalCount})
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      )}
      <p className="pt-1 text-[11px] text-ink-secondary">
        Official sources: PIB (Ministry of Defence), UPSC and the Ministry of Defence. Dates are publication dates
        {fetchedAt ? `; sources last checked ${formatCheckedAt(fetchedAt)} IST.` : "."}
      </p>
    </aside>
  );
}
