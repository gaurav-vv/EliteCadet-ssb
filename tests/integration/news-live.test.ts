// @vitest-environment node
// Live check of the real official news sources (lib/api/news.ts). Opt-in —
// it calls PIB, UPSC and the Ministry of Defence over the network:
//   NEWS_LIVE=1 npx vitest run tests/integration/news-live.test.ts
import { describe, expect, it } from "vitest";
import { getNewsCatalog, isAllowedNewsImage } from "@/lib/api/news";

describe.skipIf(!process.env.NEWS_LIVE)("live official news sources", () => {
  it("returns dated, attributed, de-duplicated items newest first", async () => {
    const c = await getNewsCatalog();
    const bySource: Record<string, number> = {};
    for (const a of c.feed) bySource[a.source] = (bySource[a.source] ?? 0) + 1;
    console.log(
      JSON.stringify(
        {
          fetchedAt: c.fetchedAt,
          failedSources: c.failedSources,
          total: c.feed.length,
          bySource,
          withImage: c.feed.filter((a) => a.image).length,
          withExcerpt: c.feed.filter((a) => a.excerpt).length,
          newest: c.feed.slice(0, 8).map((a) => `${a.date ?? "undated"} | ${a.source} | ${a.title.slice(0, 70)} | ${a.image ? "img" : "-"}`),
          ticker: c.importantUpdates.map((a) => a.title.slice(0, 60)),
        },
        null,
        2,
      ),
    );
    expect(c.feed.length).toBeGreaterThan(0);
    const dates = c.feed.map((a) => a.date).filter(Boolean) as string[];
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(c.feed.map((a) => a.id)).size).toBe(c.feed.length);
    for (const a of c.feed) if (a.image) expect(isAllowedNewsImage(a.image)).toBe(true);
  }, 180_000);
});
