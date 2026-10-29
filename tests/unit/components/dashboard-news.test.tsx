import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/student/news-ticker", () => ({ NewsTicker: ({ articles }: { articles: unknown[] }) => `ticker:${articles.length}` }));
vi.mock("@/components/student/latest-news-panel", () => ({ LatestNewsPanel: ({ articles }: { articles: unknown[] }) => `panel:${articles.length}` }));

import { DashboardNewsPanel, DashboardNewsTicker } from "@/components/dashboards/dashboard-news";
import type { DashboardNews } from "@/lib/api/news";

const news = { importantUpdates: [{}, {}], latestArticles: [{}] } as unknown as DashboardNews;

describe("dashboard news slots", () => {
  it("wait for the shared news request and render each part from it", async () => {
    const request = Promise.resolve(news);
    const ticker = await DashboardNewsTicker({ news: request });
    const panel = await DashboardNewsPanel({ news: request });
    expect(ticker?.props.articles).toHaveLength(2);
    expect(panel?.props.articles).toHaveLength(1);
  });

  it("render nothing, and do not throw, when the news request fails", async () => {
    const failed = Promise.reject(new Error("source down"));
    expect(await DashboardNewsTicker({ news: failed })).toBeNull();
    expect(await DashboardNewsPanel({ news: failed })).toBeNull();
  });
});
