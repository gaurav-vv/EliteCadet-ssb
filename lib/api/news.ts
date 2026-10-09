// Server-side defence/SSB news (AGENTS.md §9 — the only place news is fetched).
// Official sources only; each is fetched with Next's fetch cache (revalidated
// hourly) so the dashboard never scrapes on render. A failing source is
// skipped, never thrown.

import type { NewsArticle, NewsCategory } from "@/types/news";

const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 8000;
const MAX_ARTICLES = 8;

const MOD_NEWS_URL = "https://www.mod.gov.in/en/news";
const UPSC_NEWS_URL = "https://www.upsc.gov.in/whats-new";

// Only links on these hosts are ever surfaced to the browser.
const ALLOWED_HOSTS = new Set([
  "www.mod.gov.in",
  "mod.gov.in",
  "www.upsc.gov.in",
  "upsc.gov.in",
]);

const MOD_RELEVANT =
  /\b(army|navy|naval|air force|armed forces|NDA|CDS|AFCAT|SSB|agniveer|cadet|gallantry)\b/i;
const MOD_EXCLUDED = /deputation|blood donation/i;
const UPSC_RELEVANT =
  /National Defence Academy|Naval Academy|Combined Defence Services|Central Armed Police Forces|\bNDA\b|\bCDS\b|\bCAPF\b/i;
const EXAM_TITLE =
  /\b(NDA|CDS|AFCAT|examination|exam|admit card|result|notification)\b/i;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#039": "'",
};

export function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (m, n: string) => {
      const code = Number(n);
      return code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&(\w+);/g, (m, e: string) => ENTITIES[e] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export function safeUrl(href: string, base: string): string | null {
  try {
    const url = new URL(href.trim().replace(/\s/g, "%20"), base);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

// dd-mm-yyyy → yyyy-mm-dd, rejecting impossible dates.
export function parseSourceDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso
    ? null
    : iso;
}

function categorise(title: string, fallback: NewsCategory): NewsCategory {
  return EXAM_TITLE.test(title) ? "Exam Update" : fallback;
}

// Ministry of Defence "What's New" table: # | title | dd-mm-yyyy | download link.
export function parseModNews(html: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  for (const row of html.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
    const title = row.match(/views-field-title">([\s\S]*?)<\/td>/)?.[1];
    const date = row.match(
      /views-field-field-start-date">([\s\S]*?)<\/td>/,
    )?.[1];
    const href = row.match(/views-field-nothing">\s*<a href="([^"]+)"/)?.[1];
    if (!title || !date || !href) continue;

    const cleanTitle = cleanText(title);
    const url = safeUrl(cleanText(href), MOD_NEWS_URL);
    const isoDate = parseSourceDate(cleanText(date));
    if (!cleanTitle || !url || !isoDate) continue;
    if (!MOD_RELEVANT.test(cleanTitle) || MOD_EXCLUDED.test(cleanTitle))
      continue;

    articles.push({
      title: cleanTitle,
      url,
      date: isoDate,
      source: "Ministry of Defence",
      category: categorise(cleanTitle, "Official Update"),
      summary: null,
      image: null,
    });
  }
  return articles;
}

// UPSC "What's New" lists no per-item date, so none is shown for these items.
export function parseUpscNews(html: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  for (const m of html.matchAll(
    /<a href="(\/?whats-new\/[^"]+)">([\s\S]*?)<\/a>/g,
  )) {
    const title = cleanText(m[2]);
    const url = safeUrl(cleanText(m[1]), UPSC_NEWS_URL);
    if (!title || !url || !UPSC_RELEVANT.test(title)) continue;
    // Skip stale items for exam years that are already over.
    const year = Number(title.match(/\b(20\d{2})\b/)?.[1]);
    if (year && year < new Date().getFullYear()) continue;
    articles.push({
      title,
      url,
      date: null,
      source: "UPSC",
      category: "Exam Update",
      summary: null,
      image: null,
    });
  }
  return articles;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate: REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "SSBAcademy/1.0 (+news reader)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function mergeArticles(lists: NewsArticle[][], limit = MAX_ARTICLES): NewsArticle[] {
  const seen = new Set<string>();
  return lists
    .flat()
    .filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)))
    .sort((a, b) => (a.date && b.date ? b.date.localeCompare(a.date) : a.date ? -1 : b.date ? 1 : 0))
    .slice(0, limit);
}

// ---- Latest articles (third-party reading; clearly not official notices) ----

interface ArticleFeed {
  url: string;
  source: string;
}

const ARTICLE_FEEDS: ArticleFeed[] = [
  { url: "https://www.ssbcrackexams.com/feed/", source: "SSBCrackExams" },
  { url: "https://www.ssbcrack.com/feed/", source: "SSBCrack" },
  { url: "https://www.ssbcrack.com/category/ssb-interview/feed/", source: "SSBCrack" },
];
const ARTICLE_HOSTS = /(^|\.)(ssbcrack\.com|ssbcrackexams\.com)$/;
const ARTICLES_SHOWN = 5;

function safeArticleUrl(href: string): string | null {
  try {
    const url = new URL(href.trim());
    return url.protocol === "https:" && ARTICLE_HOSTS.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

// RFC-822 pubDate → publication date (YYYY-MM-DD) in IST, as the source shows it.
export function parsePubDate(raw: string): string | null {
  const d = new Date(raw.trim());
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function articleCategory(cats: string[]): NewsCategory {
  const joined = cats.join(" | ");
  if (/SSB|AFSB|Tips|Interview|Psychology/i.test(joined)) return "SSB Preparation";
  if (/Defence|Army|Navy|Air Force|BSF|Current Affairs/i.test(joined)) return "Defence News";
  return "Article";
}

function trimSummary(raw: string): string | null {
  const text = cleanText(raw).replace(/The post .* appeared first on .*$/i, "").trim();
  if (text.length < 20) return null;
  return text.length > 140 ? `${text.slice(0, 137).trimEnd()}…` : text;
}

export function parseArticleFeed(xml: string, source: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const title = cleanText(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    const url = safeArticleUrl(cleanText(item.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""));
    const date = parsePubDate(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
    if (!title || !url || !date) continue;

    const cats = [...item.matchAll(/<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/g)].map((m) => cleanText(m[1]));
    const desc = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? "";
    articles.push({ title, url, date, source, category: articleCategory(cats), summary: trimSummary(desc), image: null });
  }
  return articles;
}

// The article's own og:image — only https images hosted by the same publisher.
export function parseOgImage(html: string): string | null {
  const m =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (!m) return null;
  try {
    const url = new URL(cleanText(m[1]));
    return url.protocol === "https:" && ARTICLE_HOSTS.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

// Round-robin across feeds so one publisher/topic doesn't fill the panel.
export function pickArticles(perFeed: NewsArticle[][], exclude: Set<string>, limit = ARTICLES_SHOWN): NewsArticle[] {
  const queues = perFeed.map((list) => [...list].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")));
  const seenUrls = new Set(exclude);
  const seenTitles = new Set<string>();
  const out: NewsArticle[] = [];
  while (out.length < limit && queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (!next || out.length >= limit) continue;
      if (seenUrls.has(next.url) || seenTitles.has(next.title)) continue;
      seenUrls.add(next.url);
      seenTitles.add(next.title);
      out.push(next);
    }
  }
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

async function withImage(article: NewsArticle): Promise<NewsArticle> {
  try {
    return { ...article, image: parseOgImage(await fetchText(article.url)) };
  } catch {
    return article;
  }
}

export async function getImportantUpdates(): Promise<NewsArticle[]> {
  const [mod, upsc] = await Promise.allSettled([
    fetchText(MOD_NEWS_URL).then(parseModNews),
    fetchText(UPSC_NEWS_URL).then(parseUpscNews),
  ]);
  // UPSC lists newest first but shows no dates → keep its own order, ahead of dated MoD items.
  const upscItems = upsc.status === "fulfilled" ? upsc.value.slice(0, 3) : [];
  const modItems = mod.status === "fulfilled" ? mergeArticles([mod.value], 3) : [];
  return [...upscItems, ...modItems];
}

export async function getLatestArticles(exclude: Set<string>): Promise<NewsArticle[]> {
  const feeds = await Promise.allSettled(
    ARTICLE_FEEDS.map((f) => fetchText(f.url).then((xml) => parseArticleFeed(xml, f.source))),
  );
  const picked = pickArticles(
    feeds.map((r) => (r.status === "fulfilled" ? r.value : [])),
    exclude,
  );
  return Promise.all(picked.map(withImage));
}

export interface DashboardNews {
  importantUpdates: NewsArticle[];
  latestArticles: NewsArticle[];
}

// Two deliberately different selections: official/actionable vs. reading.
// Article URLs that match an important update are never shown twice.
export async function getDashboardNews(): Promise<DashboardNews> {
  const importantUpdates = await getImportantUpdates();
  const latestArticles = await getLatestArticles(new Set(importantUpdates.map((a) => a.url)));
  return { importantUpdates, latestArticles };
}

export function formatNewsDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
