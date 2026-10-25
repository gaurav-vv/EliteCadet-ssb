// Server-side defence/SSB news (AGENTS.md §9 — the only place news is fetched).
// Official sources only, through interfaces they publish (checked 2026-10-25):
//   * UPSC "What's New" page and the Ministry of Defence news page (HTML);
//   * PIB's Ministry of Defence release listing (pib.gov.in/allRel.aspx with
//     the ministry picker set to Defence — the listing any visitor gets), which
//     carries a month of Defence releases; PIB's all-ministry RSS holds only
//     its latest 20 releases (0–1 of them Defence on most days);
//   * PIB press releases via PIB's own RSS feed (pib.gov.in/ViewRss.aspx),
//     kept only when the release page names the Ministry of Defence.
// Newspapers (The Hindu, Indian Express) are NOT used: their RSS terms allow
// personal/non-commercial use only or require a syndication licence.
// Article images: only a photo embedded in the release itself, on PIB's own
// image host. The UI loads it through next/image, whose remotePatterns allow
// that one host + path (next.config.ts), so nothing fetches arbitrary URLs.
// The merged catalog is kept in memory for an hour (and the last good copy is
// served if every source fails), so pages never scrape on render. A failing
// source is skipped (and reported), never thrown. Students read items inside
// the app (/student/news/[id]); nothing here invents text.

import { createHash } from "node:crypto";
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
  "pib.gov.in",
  "www.pib.gov.in",
]);

// Article photos: PIB's image host and its press-release photo folder only.
const IMAGE_HOST = "static.pib.gov.in";
const IMAGE_PATH = /^\/WriteReadData\/userfiles\/image\/[^?#]+\.(?:jpe?g|png|webp|gif)$/i;
// Site-wide pictures that say nothing about the article (emblem, campaign banners).
const GENERIC_IMAGE = /emblem|logo|banner|azadi/i;

// Stable id for the in-app reader. Only ever looked up among items we fetched
// ourselves, so an id can never make the server fetch an arbitrary URL.
export function newsId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

export const isNewsId = (id: string) => /^[0-9a-f]{16}$/.test(id);

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
  // Typographic entities PIB summaries use (e.g. "Navy&rsquo;s").
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

export function cleanText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (m, n: string) => {
      const code = Number(n);
      return code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : m;
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, h: string) => {
      const code = parseInt(h, 16);
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
      id: newsId(url),
      title: cleanTitle,
      url,
      date: isoDate,
      source: "Ministry of Defence",
      category: categorise(cleanTitle, "Official Update"),
      summary: null,
      excerpt: null,
      lang: "en",
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
      id: newsId(url),
      title,
      url,
      date: null,
      source: "UPSC",
      category: "Exam Update",
      summary: null,
      excerpt: null,
      lang: "en",
      image: null,
    });
  }
  return articles;
}

async function fetchText(url: string, revalidate = REVALIDATE_SECONDS): Promise<string> {
  const res = await fetch(url, {
    next: { revalidate },
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

// ---- PIB press releases (official RSS) ----------------------------------------

// The English and Hindi feeds PIB lists both return its latest releases; the
// `Lang` parameter isn't honoured (observed 2026-10-25), so each item's
// language is detected from its text.
const PIB_FEED_URL = "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=2&Regid=3";
// A release page doesn't change once published.
const PIB_RELEASE_REVALIDATE_SECONDS = 86_400;
const PIB_RELEASES_CHECKED = 20;
const DEFENCE_MINISTRY = /^(Ministry of Defence|रक्षा मंत्रालय)$/i;
const DEVANAGARI = /[\u0900-\u097F]/;
const MONTHS: Record<string, string> = { JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06", JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12" };
const EXCERPT_MAX_CHARS = 900;
// Dashboard card: a few headlines + "View all news". The /student/news page pages through the rest.
export const CARD_SHOWN = 6;
// Dated items older than this are stale for a news feed.
const STALE_DAYS = 90;

export interface PibFeedItem {
  title: string;
  url: string;
}

// <item><title/><link/></item> → release links on pib.gov.in only (PRID = digits).
export function parsePibFeed(xml: string): PibFeedItem[] {
  const out: PibFeedItem[] = [];
  for (const item of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const title = cleanText(item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? "");
    const url = safeUrl(cleanText(item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/)?.[1] ?? ""), PIB_FEED_URL);
    if (!title || !url) continue;
    const u = new URL(url);
    if (!/^\/PressRelease(Iframe)?Page\.aspx$/i.test(u.pathname) || !/^\d{1,10}$/.test(u.searchParams.get("PRID") ?? "")) continue;
    out.push({ title, url });
  }
  return out;
}

// "Posted On: 24 OCT 2026 6:53PM by PIB Delhi" (or the Hindi label) → 2026-10-24.
export function parsePibDate(raw: string): string | null {
  const m = cleanText(raw).match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  const month = m ? MONTHS[m[2].toUpperCase()] : undefined;
  if (!m || !month) return null;
  const iso = `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

// The release's own opening paragraphs, as plain text (all markup removed),
// capped so the in-app reader shows an excerpt, not a copy of the release.
// The release body: current pages wrap it in #pibReleaseBody (observed
// 2026-10-25; #PdfDiv is a hidden print copy further down), older ones in
// #PdfDiv only.
function releaseBody(html: string): string | null {
  let at = html.search(/id=["']pibReleaseBody["']/);
  if (at < 0) at = html.search(/id=["']PdfDiv["']/);
  return at < 0 ? null : html.slice(at, at + 80_000);
}

// A photo published with the release, in order of preference: one embedded
// in the release body, then og:image, then twitter:image — each accepted only
// on PIB's image host/folder, and never a site-wide emblem or banner.
export function releaseImage(html: string): string | null {
  const candidates = [
    ...[...(releaseBody(html) ?? "").matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]),
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1],
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const url = new URL(cleanText(raw).replace(/\s/g, "%20"));
      if (url.protocol !== "https:" || url.hostname !== IMAGE_HOST) continue;
      if (!IMAGE_PATH.test(decodeURIComponent(url.pathname)) || GENERIC_IMAGE.test(url.pathname)) continue;
      return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}

// next/image remotePatterns use the same rule (next.config.ts).
export const isAllowedNewsImage = (src: string) => {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === IMAGE_HOST && IMAGE_PATH.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
};

export function pibExcerpt(html: string): string[] {
  const body = releaseBody(html);
  if (!body) return [];
  const out: string[] = [];
  let used = 0;
  for (const m of body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = cleanText(m[1]);
    if (text.length < 40 || /^\*+$/.test(text)) continue;
    if (used + text.length > EXCERPT_MAX_CHARS) {
      if (out.length === 0) out.push(`${text.slice(0, EXCERPT_MAX_CHARS - 1).trimEnd()}…`);
      break;
    }
    out.push(text);
    used += text.length;
    if (out.length >= 3) break;
  }
  return out;
}

export interface PibRelease {
  title: string;
  ministry: string;
  date: string | null;
  excerpt: string[];
  /** A photo published with the release (releaseImage), or null. */
  image?: string | null;
}

export function parsePibRelease(html: string): PibRelease | null {
  // PIB's English pages open the title with <h2 id="Titleh2"> but close it with
  // </h1>: stop at the first closing heading of any level, or the text runs on
  // into the language bar ("हिन्दी …").
  const title = cleanText(html.match(/id="Titleh2"[^>]*>([\s\S]*?)<\/h[1-6]>/)?.[1] ?? "");
  const ministry = cleanText(html.match(/id="MinistryName"[^>]*>([\s\S]*?)<div/)?.[1] ?? "");
  const date = parsePibDate(html.match(/id="PrDateTime"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? "");
  if (!ministry) return null;
  return { title, ministry, date, excerpt: pibExcerpt(html), image: releaseImage(html) };
}

// A Hindi (or regional) release page links to its English version
// ("English" in the language bar). Same release, same ministry.
export function pibEnglishVersionUrl(html: string): string | null {
  const href = html.match(/<a[^>]+href=["']([^"']*PRID=\d+[^"']*)["'][^>]*>\s*English\s*<\/a>/i)?.[1];
  if (!href) return null;
  const url = safeUrl(cleanText(href), PIB_FEED_URL);
  return url && /^\d{1,10}$/.test(new URL(url).searchParams.get("PRID") ?? "") ? url : null;
}

export function pibArticle(item: PibFeedItem, release: PibRelease): NewsArticle | null {
  if (!DEFENCE_MINISTRY.test(release.ministry)) return null;
  const title = release.title || item.title;
  return {
    id: newsId(item.url),
    title,
    url: item.url,
    date: release.date,
    source: "PIB · Ministry of Defence",
    category: categorise(title, "Defence News"),
    summary: release.excerpt[0] ? (release.excerpt[0].length > 160 ? `${release.excerpt[0].slice(0, 157).trimEnd()}…` : release.excerpt[0]) : null,
    excerpt: release.excerpt.length > 0 ? release.excerpt : null,
    lang: DEVANAGARI.test(title) ? "hi" : "en",
    image: release.image ?? null,
  };
}

// ---- PIB Ministry of Defence listing (allRel.aspx) ----------------------------

// PIB Delhi, English. The ministry picker is an ASP.NET postback: GET the page
// for its form state, then POST it back with the Defence ministry selected —
// exactly what the page's own <select> does. Two requests per refresh.
const PIB_LISTING_URL = "https://www.pib.gov.in/allRel.aspx?reg=3&lang=1";
const PIB_DEFENCE_MINISTRY_ID = "33";
// Release pages fetched for an excerpt + photo (newest first, cached a day).
const PIB_LISTING_ENRICHED = 24;
const IST_OFFSET_MS = 330 * 60_000;

export interface PibListingItem {
  title: string;
  url: string;
  date: string | null;
}

// ASP.NET hidden form state (__VIEWSTATE, __EVENTVALIDATION, …).
export function aspNetHiddenFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const m of html.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/type=["']hidden["']/i.test(tag)) continue;
    const name = tag.match(/\bname=["']([^"']+)["']/i)?.[1];
    if (name && /^__[A-Z]+$/.test(name)) fields[name] = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] ?? "";
  }
  return fields;
}

// <li><a title='…' href='/PressReleaseDetail.aspx?PRID=…'>…</a><span class='publishdatesmall'>Posted On: 24 Oct 2026</li>
// (PIB leaves that <span> unclosed, so the date is read as text up to the next tag.)
// Returns null unless the response really is the Defence-filtered listing (so
// an ignored postback never passes off all ministries as Defence).
export function parsePibListing(html: string): PibListingItem[] | null {
  const selected = html.match(/name=["']ctl00\$ContentPlaceHolder1\$ddlMinistry["'][\s\S]*?<option[^>]*selected=["']selected["'][^>]*value=["'](\d+)["']/i)?.[1];
  if (selected !== PIB_DEFENCE_MINISTRY_ID) return null;
  const out: PibListingItem[] = [];
  for (const m of html.matchAll(/<li>\s*<a\b[^>]*href=['"]([^'"]*PRID=(\d{1,10})[^'"]*)['"][^>]*>([\s\S]*?)<\/a>\s*(?:<span[^>]*publishdatesmall[^>]*>([^<]*))?/gi)) {
    const title = cleanText(m[3]);
    const url = safeUrl(`/PressReleasePage.aspx?PRID=${m[2]}`, PIB_LISTING_URL);
    if (!title || !url) continue;
    out.push({ title, url, date: m[4] ? parsePibDate(m[4]) : null });
  }
  return out;
}

async function postPibListing(fields: Record<string, string>, cookie: string, month: number, year: number): Promise<string> {
  const body = new URLSearchParams({
    ...fields,
    __EVENTTARGET: "ctl00$ContentPlaceHolder1$ddlMinistry",
    __EVENTARGUMENT: "",
    ctl00$Bar1$ddlregion: "3",
    ctl00$Bar1$ddlLang: "1",
    ctl00$ContentPlaceHolder1$ddlMinistry: PIB_DEFENCE_MINISTRY_ID,
    ctl00$ContentPlaceHolder1$ddlday: "0",
    ctl00$ContentPlaceHolder1$ddlMonth: String(month),
    ctl00$ContentPlaceHolder1$ddlYear: String(year),
  });
  const res = await fetch(PIB_LISTING_URL, {
    method: "POST",
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS * 2),
    headers: { "User-Agent": "SSBAcademy/1.0 (+news reader)", "Content-Type": "application/x-www-form-urlencoded", ...(cookie ? { Cookie: cookie } : {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function listingArticle(item: PibListingItem): NewsArticle {
  return {
    id: newsId(item.url),
    title: item.title,
    url: item.url,
    date: item.date,
    source: "PIB · Ministry of Defence",
    category: categorise(item.title, "Defence News"),
    summary: null,
    excerpt: null,
    lang: DEVANAGARI.test(item.title) ? "hi" : "en",
    image: null,
  };
}

async function getPibDefenceListing(now = Date.now()): Promise<NewsArticle[]> {
  const first = await fetch(PIB_LISTING_URL, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS * 2),
    headers: { "User-Agent": "SSBAcademy/1.0 (+news reader)" },
  });
  if (!first.ok) throw new Error(`HTTP ${first.status}`);
  const cookie = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const fields = aspNetHiddenFields(await first.text());
  if (!fields.__VIEWSTATE) throw new Error("PIB listing form not found");

  // This month (India time); early in a month, last month too.
  const ist = new Date(now + IST_OFFSET_MS);
  const months = [{ month: ist.getUTCMonth() + 1, year: ist.getUTCFullYear() }];
  if (ist.getUTCDate() <= 10) {
    const prev = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - 1, 1));
    months.push({ month: prev.getUTCMonth() + 1, year: prev.getUTCFullYear() });
  }
  const items: PibListingItem[] = [];
  for (const { month, year } of months) {
    const listing = parsePibListing(await postPibListing(fields, cookie, month, year));
    if (!listing) throw new Error("PIB did not return the Defence listing");
    items.push(...listing);
  }

  const articles = buildFeed([items.map(listingArticle)], now);
  // Excerpt + photo for the newest releases; a page that fails keeps its listing entry.
  const enriched = new Map<string, NewsArticle>();
  const toEnrich = articles.slice(0, PIB_LISTING_ENRICHED);
  for (let i = 0; i < toEnrich.length; i += 4) {
    const batch = await Promise.allSettled(
      toEnrich.slice(i, i + 4).map(async (a) => {
        const release = parsePibRelease(await fetchText(a.url, PIB_RELEASE_REVALIDATE_SECONDS));
        const full = release ? pibArticle({ title: a.title, url: a.url }, release) : null;
        // The listing's date is authoritative if the page's own can't be read.
        return full ? { ...full, date: full.date ?? a.date } : null;
      }),
    );
    batch.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) enriched.set(toEnrich[i + j].id, r.value);
    });
  }
  return articles.map((a) => enriched.get(a.id) ?? a);
}

async function getPibDefenceReleases(): Promise<NewsArticle[]> {
  const items = parsePibFeed(await fetchText(PIB_FEED_URL)).slice(0, PIB_RELEASES_CHECKED);
  const out: NewsArticle[] = [];
  // Five at a time: polite to PIB, and each page is cached for a day.
  for (let i = 0; i < items.length; i += 5) {
    const batch = await Promise.allSettled(
      items.slice(i, i + 5).map(async (item) => {
        const html = await fetchText(item.url, PIB_RELEASE_REVALIDATE_SECONDS);
        const release = parsePibRelease(html);
        const article = release ? pibArticle(item, release) : null;
        if (!article || article.lang === "en") return article;
        // Prefer the English version of a Hindi Defence release for an English UI.
        const englishUrl = pibEnglishVersionUrl(html);
        if (!englishUrl) return article;
        try {
          const english = parsePibRelease(await fetchText(englishUrl, PIB_RELEASE_REVALIDATE_SECONDS));
          return (english && pibArticle({ title: english.title, url: englishUrl }, english)) ?? article;
        } catch {
          return article;
        }
      }),
    );
    for (const r of batch) if (r.status === "fulfilled" && r.value) out.push(r.value);
  }
  return out;
}

// Same story, different URL spellings: a PIB release is one PRID whichever
// page variant links it; elsewhere ignore case of host, #fragments,
// tracking parameters and a trailing slash.
export function canonicalKey(url: string): string {
  try {
    const u = new URL(url);
    const prid = u.searchParams.get("PRID");
    if (/(^|\.)pib\.gov\.in$/.test(u.hostname) && prid) return `pib:${prid}`;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(k)) u.searchParams.delete(k);
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return url;
  }
}

export const normalizeTitle = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// All sources → one feed: valid items only, nothing stale, each story once
// (by canonical URL, then by normalized headline), newest first. Undated
// official notices (UPSC lists no dates) follow the dated items in their
// source's own order.
export function buildFeed(lists: NewsArticle[][], now = Date.now(), staleDays = STALE_DAYS): NewsArticle[] {
  // staleDays = Infinity → keep every date (used to merge already-filtered lists).
  const cutoff = Number.isFinite(staleDays) ? new Date(now - staleDays * 86_400_000).toISOString().slice(0, 10) : "";
  const urls = new Set<string>();
  const titles = new Set<string>();
  const kept: NewsArticle[] = [];
  for (const a of lists.flat()) {
    if (!a.title.trim() || !a.url) continue;
    if (a.date && a.date < cutoff) continue;
    const key = canonicalKey(a.url);
    const title = normalizeTitle(a.title);
    if (urls.has(key) || (title && titles.has(title))) continue;
    urls.add(key);
    if (title) titles.add(title);
    kept.push(a);
  }
  const dated = kept.filter((a) => a.date).sort((a, b) => b.date!.localeCompare(a.date!));
  return [...dated, ...kept.filter((a) => !a.date)];
}

// ---- Dashboard + in-app reader -------------------------------------------------

export interface DashboardNews {
  importantUpdates: NewsArticle[];
  // The first CARD_SHOWN items of the feed.
  latestArticles: NewsArticle[];
  // How many items the full feed (/student/news) has.
  totalCount: number;
  // Sources that couldn't be reached this time (names only) → partial state.
  failedSources: string[];
  // When the sources were last checked (ISO) — not a publication date.
  fetchedAt: string;
}

interface NewsCatalog extends DashboardNews {
  feed: NewsArticle[];
  all: NewsArticle[];
}

async function loadNewsCatalog(): Promise<NewsCatalog> {
  const sources = [
    { name: "UPSC", load: () => fetchText(UPSC_NEWS_URL).then(parseUpscNews) },
    { name: "Ministry of Defence", load: () => fetchText(MOD_NEWS_URL).then(parseModNews) },
    { name: "PIB Defence releases", load: () => getPibDefenceListing() },
    { name: "PIB", load: getPibDefenceReleases },
  ];
  const settled = await Promise.allSettled(sources.map((s) => s.load()));
  const [upsc, mod, pibListing, pib] = settled.map((r) => (r.status === "fulfilled" ? r.value : []));
  const failedSources = sources.filter((_, i) => settled[i].status === "rejected").map((s) => s.name);

  // Feed (card + /student/news): everything, newest first. The ticker only
  // highlights some of the same items; it no longer removes them from the
  // feed (that left the card with almost nothing). Listing entries first so
  // an enriched release wins over its RSS duplicate (same PRID).
  const feed = buildFeed([pibListing, pib, mod, upsc]);
  // Ticker: actionable official notices. UPSC lists newest first but shows no
  // dates → keep its order, ahead of dated MoD items; then exam-related and
  // the newest Defence releases, up to 5.
  const notices = [...upsc.slice(0, 3), ...mergeArticles([mod], 3)];
  const importantUpdates = buildFeed([notices, feed.filter((a) => a.category === "Exam Update"), feed], Date.now(), Number.POSITIVE_INFINITY).slice(0, Math.max(5, notices.length));
  const all = buildFeed([feed, importantUpdates], Date.now(), Number.POSITIVE_INFINITY);
  return { importantUpdates, latestArticles: feed.slice(0, CARD_SHOWN), totalCount: feed.length, failedSources, fetchedAt: new Date().toISOString(), feed, all };
}

// One shared copy per server instance: refreshed at most hourly, concurrent
// renders share one refresh, and if every source fails the last good copy is
// kept (with the failures reported). A failed first load is retried after
// RETRY_FAILED_MS rather than an hour.
const CATALOG_TTL_MS = REVALIDATE_SECONDS * 1000;
const RETRY_FAILED_MS = 5 * 60_000;
let cachedCatalog: { expires: number; value: NewsCatalog } | null = null;
let pendingCatalog: Promise<NewsCatalog> | null = null;

export function resetNewsCache() {
  cachedCatalog = null;
  pendingCatalog = null;
}

export async function getNewsCatalog(): Promise<NewsCatalog> {
  if (cachedCatalog && Date.now() < cachedCatalog.expires) return cachedCatalog.value;
  pendingCatalog ??= loadNewsCatalog()
    .then((fresh) => {
      const empty = fresh.all.length === 0 && fresh.failedSources.length > 0;
      const value = empty && cachedCatalog ? { ...cachedCatalog.value, failedSources: fresh.failedSources } : fresh;
      cachedCatalog = { expires: Date.now() + (empty ? RETRY_FAILED_MS : CATALOG_TTL_MS), value };
      return value;
    })
    .finally(() => {
      pendingCatalog = null;
    });
  return pendingCatalog;
}

export async function getDashboardNews(): Promise<DashboardNews> {
  const { importantUpdates, latestArticles, totalCount, failedSources, fetchedAt } = await getNewsCatalog();
  return { importantUpdates, latestArticles, totalCount, failedSources, fetchedAt };
}

export interface NewsFeedQuery {
  category?: NewsCategory | "all";
  q?: string;
  // 1-based "Load more" page: page N shows the first N × pageSize matches.
  page?: number;
}

export const NEWS_PAGE_SIZE = 10;

// /student/news: the full feed, filtered by category and search, "load more" paging.
export function queryFeed(feed: NewsArticle[], { category = "all", q = "", page = 1 }: NewsFeedQuery) {
  const needle = q.trim().toLowerCase().slice(0, 80);
  const matches = feed.filter(
    (a) => (category === "all" || a.category === category) && (!needle || `${a.title} ${a.summary ?? ""} ${a.source}`.toLowerCase().includes(needle)),
  );
  const safePage = Math.max(1, Math.min(Number.isFinite(page) ? Math.floor(page) : 1, 50));
  return { items: matches.slice(0, safePage * NEWS_PAGE_SIZE), total: matches.length, hasMore: matches.length > safePage * NEWS_PAGE_SIZE, page: safePage };
}

export async function getNewsFeed(): Promise<{ feed: NewsArticle[]; failedSources: string[]; fetchedAt: string }> {
  const { feed, failedSources, fetchedAt } = await getNewsCatalog();
  return { feed, failedSources, fetchedAt };
}

// The in-app reader: only items from our own (cached) catalog.
export async function getNewsArticle(id: string): Promise<NewsArticle | null> {
  if (!isNewsId(id)) return null;
  const { all } = await getNewsCatalog();
  return all.find((a) => a.id === id) ?? null;
}

export function formatNewsDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
