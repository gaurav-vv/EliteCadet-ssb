import { Newspaper } from "lucide-react";
import { formatNewsDate } from "@/lib/api/news";
import type { NewsArticle } from "@/types/news";

function Thumbnail({ article }: { article: NewsArticle }) {
  if (article.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- publisher-hosted og:image, validated host; not optimised via next/image
      <img
        src={article.image}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-[60px] w-[80px] shrink-0 rounded-lg bg-black/5 object-cover"
      />
    );
  }
  return (
    <span className="flex h-[60px] w-[80px] shrink-0 items-center justify-center rounded-lg bg-black/5 text-ink-secondary">
      <Newspaper aria-hidden="true" size={22} />
    </span>
  );
}

const BADGE: Record<NewsArticle["category"], string> = {
  "Official Update": "bg-rose-50 text-rose-700",
  "Exam Update": "bg-rose-50 text-rose-700",
  "Defence News": "bg-emerald-50 text-emerald-700",
  "SSB Preparation": "bg-indigo-50 text-indigo-700",
  Article: "bg-sky-50 text-sky-700",
};

// Reading list: SSB preparation and defence articles — never the same items
// as the Important News ticker (selection happens in lib/api/news.ts).
export function LatestNewsPanel({ articles }: { articles: NewsArticle[] }) {
  return (
    <aside aria-labelledby="latest-news-title" className="glass-regular flex flex-col gap-1 rounded-card p-5">
      <h2 id="latest-news-title" className="text-[18px] font-semibold text-ink">
        Latest Articles &amp; News
      </h2>
      {articles.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-secondary">
          We couldn&apos;t load articles right now. Please check back soon.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5">
          {articles.map((a) => (
            <li key={a.url}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex gap-3 py-2.5 no-underline hover:opacity-80"
              >
                <Thumbnail article={a} />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-secondary">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[a.category]}`}>
                      {a.category}
                    </span>
                    {a.date && <time dateTime={a.date}>{formatNewsDate(a.date)}</time>}
                  </span>
                  <span className="line-clamp-2 text-[14px] leading-snug font-semibold text-ink">{a.title}</span>
                  <span className="text-[11px] text-ink-secondary">{a.source}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 text-[11px] text-ink-secondary">
        Third-party articles — not official notifications.
      </p>
    </aside>
  );
}
