import { LatestNewsPanel } from "@/components/student/latest-news-panel";
import { NewsTicker } from "@/components/student/news-ticker";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardNews } from "@/lib/api/news";

// The dashboard's news comes from external sites, so it is the slowest and least
// important part of the page. The page starts the request without awaiting it and
// these two server components wait for it inside <Suspense>, so the dashboard's
// own data shows as soon as it is ready. getDashboardNews() never rejects (a
// failing source is skipped), but a rejection is still treated as "no news".
async function resolveNews(news: Promise<DashboardNews>): Promise<DashboardNews | null> {
  try {
    return await news;
  } catch {
    return null;
  }
}

export async function DashboardNewsTicker({ news }: { news: Promise<DashboardNews> }) {
  const resolved = await resolveNews(news);
  return resolved ? <NewsTicker articles={resolved.importantUpdates} /> : null;
}

export async function DashboardNewsPanel({ news }: { news: Promise<DashboardNews> }) {
  const resolved = await resolveNews(news);
  return resolved ? <LatestNewsPanel articles={resolved.latestArticles} totalCount={resolved.totalCount} unavailable={resolved.failedSources.length > 0} fetchedAt={resolved.fetchedAt} /> : null;
}

export function DashboardNewsPanelFallback() {
  return (
    <div role="status" aria-live="polite" className="glass-regular flex flex-col gap-3 rounded-card p-5">
      <span className="sr-only">Loading articles…</span>
      <Skeleton className="h-6 w-48" />
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[60px] w-full" />
      ))}
    </div>
  );
}
