import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ExternalLink, Newspaper } from "lucide-react";
import { NewsThumbnail } from "@/components/student/news-thumbnail";
import { EmptyState } from "@/components/ui/empty-state";
import { formatNewsDate, getNewsArticle } from "@/lib/api/news";

export const metadata: Metadata = { title: "News" };

// In-app reader for a dashboard news item. Only items from our own cached,
// official-source catalog can be shown (lib/api/news.ts), and only what we may
// show: the headline, source, date and — for PIB releases — the release's own
// opening paragraphs, quoted with attribution. The official page is an
// optional, clearly separate link; nothing opens or embeds it automatically.
export default async function StudentNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getNewsArticle(id);

  const back = (
    <nav aria-label="Back" className="flex flex-wrap gap-x-4 gap-y-1">
      <Link href="/student" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Back to dashboard
      </Link>
      <Link href="/student/news" className="inline-flex w-fit items-center text-[13px] text-ink-secondary no-underline hover:text-ink">
        All news
      </Link>
      <Link href="/student/resources/current-affairs" className="inline-flex w-fit items-center text-[13px] text-ink-secondary no-underline hover:text-ink">
        Daily Current Affairs
      </Link>
    </nav>
  );

  if (!article) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10">
        {back}
        <div className="glass-regular rounded-card">
          <EmptyState
            icon={<Newspaper aria-hidden="true" size={22} />}
            title="This news item isn't available"
            description="It may have dropped out of the latest official updates. Pick another from your dashboard."
          />
        </div>
      </div>
    );
  }

  const host = new URL(article.url).hostname.replace(/^www\./, "");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10">
      {back}
      <article aria-labelledby="news-title" lang={article.lang} className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
        <header className="flex flex-col gap-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-secondary" lang="en">
            <span className="font-semibold text-ink">{article.source}</span>
            <span aria-hidden="true">·</span>
            <span>{article.category}</span>
            {article.date && (
              <>
                <span aria-hidden="true">·</span>
                <time dateTime={article.date}>{formatNewsDate(article.date)}</time>
              </>
            )}
            {article.lang === "hi" && (
              <>
                <span aria-hidden="true">·</span>
                <span>Published in Hindi</span>
              </>
            )}
          </p>
          <h1 id="news-title" className="text-[24px] leading-tight font-bold text-ink sm:text-[28px]">
            {article.title}
          </h1>
        </header>

        {article.image && (
          <figure className="flex flex-col gap-1.5">
            <NewsThumbnail article={article} className="aspect-[16/9] w-full rounded-xl" sizes="(min-width: 768px) 720px, 100vw" priority />
            <figcaption lang="en" className="text-[11px] text-ink-secondary">
              Photo published with the release · {article.source.split(" · ")[0]}
            </figcaption>
          </figure>
        )}

        {article.excerpt ? (
          <section aria-labelledby="excerpt-label" className="flex flex-col gap-3">
            <h2 id="excerpt-label" lang="en" className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">
              Excerpt from the official release
            </h2>
            {article.excerpt.map((paragraph, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
            <p lang="en" className="text-[13px] text-ink-secondary">
              This is the opening of the release as published by {article.source.split(" · ")[0]}. The complete text is on the official site.
            </p>
          </section>
        ) : (
          <p lang="en" className="text-[15px] leading-relaxed text-ink-secondary">
            This official notice is published as a document on {host}. EliteCadet shows its title{article.date ? " and date" : ""} here; the document itself is
            available only on the official site.
          </p>
        )}

        <footer lang="en" className="flex flex-col gap-1 border-t border-hairline pt-4">
          <p className="text-[12px] text-ink-secondary">Source: {article.source}. Official content belongs to the Government of India.</p>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit min-h-11 items-center gap-1.5 text-[13px] text-brand-accent"
          >
            {article.excerpt ? "Read the full release" : "Open the official notice"} on {host}
            <ExternalLink aria-hidden="true" size={14} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </footer>
      </article>
    </div>
  );
}
