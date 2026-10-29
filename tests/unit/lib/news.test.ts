// @vitest-environment node
// Dashboard news (lib/api/news.ts): official sources only, normalized with
// attribution, safe against hostile feed content, de-duplicated, and resilient
// to a source being down. Network is faked; nothing here calls a publisher.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aspNetHiddenFields,
  buildFeed,
  canonicalKey,
  CARD_SHOWN,
  cleanText,
  getDashboardNews,
  getNewsFeed,
  getNewsArticle,
  isAllowedNewsImage,
  isNewsId,
  mergeArticles,
  newsId,
  parseModNews,
  parsePibListing,
  parsePibDate,
  parsePibFeed,
  parsePibRelease,
  parseSourceDate,
  parseUpscNews,
  pibArticle,
  pibEnglishVersionUrl,
  queryFeed,
  releaseImage,
  resetNewsCache,
  NEWS_PAGE_SIZE,
  normalizeTitle,
  safeUrl,
} from "@/lib/api/news";
import type { NewsArticle } from "@/types/news";

const modRow = (title: string, date: string, href: string) => `<tr>
<td class="views-field views-field-title">${title}   </td>
<td class="views-field views-field-field-start-date">${date}   </td>
<td class="views-field views-field-nothing"><a href="${href}" target="_blank">Download</a></td></tr>`;

const article = (over: Partial<NewsArticle> = {}): NewsArticle => {
  const url = over.url ?? "https://www.mod.gov.in/a";
  return { id: newsId(url), title: "a", url, date: "2026-01-01", source: "s", category: "Official Update", summary: null, excerpt: null, lang: "en", image: null, ...over };
};

const pibFeed = (items: { title: string; link: string }[]) =>
  `<?xml version="1.0"?><rss version="2.0"><channel><title>Press Information Bureau</title>${items.map((i) => `<item><title>${i.title}</title><link>${i.link}</link></item>`).join("")}</channel></rss>`;

// "Posted On: 25 OCT 2026" for today, so fixtures never age past the stale cutoff.
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const todayPosted = () => {
  const d = new Date();
  return `Posted On: ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} 6:53PM by PIB Delhi`;
};

const pibPage = (o: { title: string; ministry: string; date?: string; paragraphs?: string[] }) => `<html><body>
  <div id="MinistryName" class="MinistryNameSubhead text-center"> ${o.ministry} <div class="x"></div></div>
  <h2 id="Titleh2"> ${o.title} </h2>
  <div id="PrDateTime" class="ReleaseDateSubHeaddateTime text-center pt20">${o.date ?? todayPosted()}</div>
  <div id="PdfDiv">${(o.paragraphs ?? []).map((p) => `<p style="text-align:justify">${p}</p>`).join("")}</div>
</body></html>`;

const PIB_LINK = "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2328001";

// PIB allRel.aspx with the Ministry of Defence picked: form state + list. PIB
// leaves each date <span> unclosed (as the live page does).
const PIB_LISTING = "https://www.pib.gov.in/allRel.aspx";
const postedToday = () => todayPosted().replace(/ d+:d+[AP]M by PIB Delhi/, "");
const pibListing = (items: { prid: number; title: string; posted?: string }[], ministry = "33") => `<html><body><form>
  <input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="vs" />
  <input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="ev" />
  <select name="ctl00$ContentPlaceHolder1$ddlMinistry"><option value="0">All Ministry</option><option selected="selected" value="${ministry}">Ministry</option></select>
  <ul class="leftul">${items.map((i) => `<li><a title="${i.title}" href="/PressReleaseDetail.aspx?PRID=${i.prid}" target="_blank">${i.title} </a><span class="publishdatesmall">${i.posted ?? postedToday()}</li>`).join("")}</ul>
</form></body></html>`;
const releaseUrl = (prid: number) => `https://www.pib.gov.in/PressReleasePage.aspx?PRID=${prid}`;

describe("official HTML sources (unchanged behaviour)", () => {
  it("parses relevant MoD rows with real dates, ids and attribution; skips irrelevant ones", () => {
    const html = modRow("Independence Day &ndash; Gallantry Awards", "14-08-2026", "/sites/default/files/a.pdf") + modRow("Organization of Blood Donation Camp", "17-09-2026", "/sites/default/files/b.pdf");
    const out = parseModNews(html);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ date: "2026-08-14", url: "https://www.mod.gov.in/sites/default/files/a.pdf", source: "Ministry of Defence", lang: "en", excerpt: null });
    expect(out[0].id).toBe(newsId(out[0].url));
  });

  it("keeps only defence-exam UPSC items and leaves date null", () => {
    const html = `<a href="whats-new/National Defence Academy Examination (II), 2026/Result">Result: NDA II</a>
      <a href="/whats-new/Foo/Notice">Notice: Ministry of MSME post</a>`;
    const out = parseUpscNews(html);
    expect(out).toHaveLength(1);
    expect(out[0].date).toBeNull();
    expect(out[0].url.startsWith("https://www.upsc.gov.in/whats-new/")).toBe(true);
  });

  it("rejects non-https, off-allowlist and malformed URLs", () => {
    expect(safeUrl("http://www.mod.gov.in/x", "https://www.mod.gov.in")).toBeNull();
    expect(safeUrl("https://evil.example/x", "https://www.mod.gov.in")).toBeNull();
    expect(safeUrl("javascript:alert(1)", "https://www.mod.gov.in")).toBeNull();
    expect(safeUrl("https://www.ssbcrack.com/x", "https://www.mod.gov.in")).toBeNull();
  });

  it("validates dates, strips tags and dedupes by URL, newest first", () => {
    expect(parseSourceDate("31-02-2026")).toBeNull();
    expect(cleanText("<b>A &amp; B</b>")).toBe("A & B");
    const a = article();
    const b = article({ title: "b", url: "https://www.mod.gov.in/b", date: "2026-02-01" });
    expect(mergeArticles([[a, b], [a]]).map((x) => x.title)).toEqual(["b", "a"]);
  });
});

describe("PIB press releases", () => {
  it("accepts only pib.gov.in release links with a numeric PRID", () => {
    const xml = pibFeed([
      { title: "Navy commissions a new vessel", link: PIB_LINK },
      { title: "<![CDATA[CDATA &amp; title]]>", link: "<![CDATA[https://www.pib.gov.in/PressReleasePage.aspx?PRID=12]]>" },
      { title: "Off-site", link: "https://evil.example/PressReleaseIframePage.aspx?PRID=1" },
      { title: "Wrong page", link: "https://pib.gov.in/MediaInvitationDetail.aspx?InvitationID=5" },
      { title: "Bad PRID", link: "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=1;drop" },
      { title: "Script", link: "javascript:alert(1)" },
      { title: "", link: PIB_LINK },
    ]);
    expect(parsePibFeed(xml)).toEqual([
      { title: "Navy commissions a new vessel", url: PIB_LINK },
      { title: "CDATA & title", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=12" },
    ]);
  });

  it("reads PIB dates in English and Hindi labels and rejects impossible ones", () => {
    expect(parsePibDate("Posted On: 24 OCT 2026 6:53PM by PIB Delhi")).toBe("2026-10-24");
    expect(parsePibDate("प्रविष्टि तिथि: 5 Nov 2026 3:22PM by PIB Delhi")).toBe("2026-11-05");
    expect(parsePibDate("Posted On: 31 FEB 2026")).toBeNull();
    expect(parsePibDate("yesterday")).toBeNull();
  });

  it("keeps Ministry of Defence releases (English or Hindi) with attribution, date, language and excerpt", () => {
    const en = parsePibRelease(pibPage({ title: "Indian Navy commissions INS Example", ministry: "Ministry of Defence", paragraphs: ["The Indian Navy commissioned INS Example at Mumbai today in the presence of senior officers."] }))!;
    const a = pibArticle({ title: "feed title", url: PIB_LINK }, en)!;
    expect(a).toMatchObject({ id: newsId(PIB_LINK), title: "Indian Navy commissions INS Example", url: PIB_LINK, date: new Date().toISOString().slice(0, 10), source: "PIB · Ministry of Defence", category: "Defence News", lang: "en", image: null });
    expect(a.excerpt).toEqual(["The Indian Navy commissioned INS Example at Mumbai today in the presence of senior officers."]);

    const hi = pibArticle({ title: "t", url: PIB_LINK }, parsePibRelease(pibPage({ title: "भारतीय नौसेना की नई पनडुब्बी", ministry: "रक्षा मंत्रालय" }))!)!;
    expect(hi.lang).toBe("hi");
    expect(hi.excerpt).toBeNull();
  });

  it("reads the title even when PIB closes <h2 id=Titleh2> with </h1> (live English pages do)", () => {
    const html = pibPage({ title: "x", ministry: "Ministry of Defence" }).replace(
      /<h2 id="Titleh2">[\s\S]*?<\/h2>/,
      '<h2 id="Titleh2"> Indigenous AIP system achieves milestone </h1><h3><a href="#">हिन्दी</a></h3>',
    );
    const r = parsePibRelease(html)!;
    expect(r.title).toBe("Indigenous AIP system achieves milestone");
    expect(pibArticle({ title: "t", url: PIB_LINK }, r)!.lang).toBe("en");
  });

  it("finds a Hindi release's English version link, on pib.gov.in only", () => {
    const html = `<div class="ReleaseLang"><a href='/PressReleasePage.aspx?PRID=2328040'>English</a> <a href='/PressReleasePage.aspx?PRID=2328057'>Urdu</a></div>`;
    expect(pibEnglishVersionUrl(html)).toBe("https://pib.gov.in/PressReleasePage.aspx?PRID=2328040");
    expect(pibEnglishVersionUrl(`<a href="https://evil.example/x?PRID=1">English</a>`)).toBeNull();
    expect(pibEnglishVersionUrl("<p>no versions</p>")).toBeNull();
  });

  it("drops releases from other ministries, including ones whose text merely mentions security", () => {
    const home = parsePibRelease(pibPage({ title: "सुरक्षा पर गृह मंत्रालय की बैठक", ministry: "गृह मंत्रालय" }))!;
    expect(pibArticle({ title: "t", url: PIB_LINK }, home)).toBeNull();
    expect(parsePibRelease("<html><h2 id=\"Titleh2\">No ministry</h2></html>")).toBeNull();
  });

  it("strips hostile markup from feed and release text, and caps the excerpt", () => {
    const long = "x".repeat(400);
    const r = parsePibRelease(
      pibPage({
        title: 'Army <img src=x onerror="alert(1)"> drill <script>alert(2)</script>',
        ministry: "Ministry of Defence",
        paragraphs: ["***", "short", `First <a href="javascript:alert(3)">para</a> &amp; ${long}`, `Second ${long}`, `Third ${long}`, `Fourth ${long}`],
      }),
    )!;
    expect(r.title).not.toMatch(/[<>]/);
    expect(r.title).not.toMatch(/onerror/);
    expect(r.excerpt.join(" ")).not.toMatch(/[<>]|javascript:/);
    expect(r.excerpt[0].startsWith("First para & ")).toBe(true);
    expect(r.excerpt.length).toBeLessThanOrEqual(3);
    expect(r.excerpt.join("").length).toBeLessThanOrEqual(900);
    const a = pibArticle({ title: "t", url: PIB_LINK }, r)!;
    expect(a.summary!.length).toBeLessThanOrEqual(160);
  });
});

describe("ids, selection and duplicates", () => {
  it("gives each URL a stable 16-hex id and rejects anything else as an id", () => {
    expect(newsId(PIB_LINK)).toBe(newsId(PIB_LINK));
    expect(newsId(PIB_LINK)).not.toBe(newsId(`${PIB_LINK}0`));
    expect(isNewsId(newsId(PIB_LINK))).toBe(true);
    for (const bad of ["", "../../etc/passwd", "https://evil.example", "ABCDEF0123456789", "0123"]) expect(isNewsId(bad)).toBe(false);
  });

  it("treats URL spellings of the same story as one (PIB PRID, www, #, utm, trailing slash)", () => {
    expect(canonicalKey("https://pib.gov.in/PressReleaseIframePage.aspx?PRID=7")).toBe(canonicalKey("https://www.pib.gov.in/PressReleasePage.aspx?PRID=7"));
    expect(canonicalKey("https://www.upsc.gov.in/a/?utm_source=x#top")).toBe(canonicalKey("https://upsc.gov.in/a"));
    expect(canonicalKey("https://upsc.gov.in/a?id=1")).not.toBe(canonicalKey("https://upsc.gov.in/a?id=2"));
    expect(normalizeTitle("  Army’s NEW  drill — Phase-II! ")).toBe(normalizeTitle("army s new drill phase ii"));
  });
});

describe("buildFeed — multiple sources into one feed", () => {
  const NOW = Date.parse("2026-10-25T12:00:00Z");
  const day = (d: string) => `2026-10-${d}`;

  it("keeps many articles from several sources, newest first, undated notices after dated ones", () => {
    const pib = Array.from({ length: 8 }, (_, i) => article({ title: `PIB release ${i}`, url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${100 + i}`, date: day(String(10 + i).padStart(2, "0")) }));
    const upsc = [article({ title: "UPSC notice A", url: "https://www.upsc.gov.in/a", date: null }), article({ title: "UPSC notice B", url: "https://www.upsc.gov.in/b", date: null })];
    const feed = buildFeed([pib, upsc], NOW);
    expect(feed).toHaveLength(10);
    expect(feed.slice(0, 8).map((a) => a.date)).toEqual([...pib.map((a) => a.date)].sort().reverse());
    expect(feed.slice(8).map((a) => a.title)).toEqual(["UPSC notice A", "UPSC notice B"]);
  });

  it("removes duplicates by canonical URL and by normalized headline", () => {
    const a = article({ title: "Navy commissions INS Example", url: "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=5", date: day("20") });
    const sameUrl = article({ title: "Different wording", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=5", date: day("20") });
    const sameTitle = article({ title: "NAVY commissions INS Example!", url: "https://www.upsc.gov.in/x", date: day("19") });
    expect(buildFeed([[a, sameUrl, sameTitle]], NOW).map((x) => x.title)).toEqual(["Navy commissions INS Example"]);
  });

  it("drops stale and malformed items", () => {
    const fresh = article({ title: "Fresh", url: "https://www.mod.gov.in/f", date: day("20") });
    const stale = article({ title: "Old", url: "https://www.mod.gov.in/o", date: "2026-05-01" });
    const blank = article({ title: "   ", url: "https://www.mod.gov.in/b", date: day("21") });
    expect(buildFeed([[fresh, stale, blank]], NOW).map((x) => x.title)).toEqual(["Fresh"]);
  });

  it("returns an empty feed for empty sources", () => {
    expect(buildFeed([[], []], NOW)).toEqual([]);
  });
});

describe("queryFeed — /student/news filters and Load more", () => {
  const feed = Array.from({ length: 25 }, (_, i) =>
    article({ title: `${i % 2 ? "Exam result" : "Navy update"} ${i}`, url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${i + 1}`, category: i % 2 ? "Exam Update" : "Defence News" }),
  );

  it("shows at least 10 when 10+ are available, then 10 more per Load more", () => {
    expect(queryFeed(feed, {})).toMatchObject({ total: 25, hasMore: true });
    expect(queryFeed(feed, {}).items).toHaveLength(NEWS_PAGE_SIZE);
    expect(queryFeed(feed, { page: 2 }).items).toHaveLength(20);
    expect(queryFeed(feed, { page: 3 })).toMatchObject({ hasMore: false });
    expect(queryFeed(feed, { page: 3 }).items).toHaveLength(25);
  });

  it("filters by category and search, and tolerates junk page values", () => {
    expect(queryFeed(feed, { category: "Exam Update" }).total).toBe(12);
    expect(queryFeed(feed, { q: "NAVY update 4" }).items.map((a) => a.title)).toEqual(["Navy update 4"]);
    expect(queryFeed(feed, { q: "nothing like this" }).total).toBe(0);
    expect(queryFeed(feed, { page: Number("abc") }).page).toBe(1);
    expect(queryFeed(feed, { page: -5 }).page).toBe(1);
  });
});

describe("source failures and the in-app reader lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNewsCache();
  });

  // The PIB Defence listing (GET and POST share a URL here): an empty month by default.
  function fakeWeb(routes: Record<string, string | Error>) {
    const all: Record<string, string | Error> = { [PIB_LISTING]: pibListing([]), ...routes };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const key = Object.keys(all).find((k) => input.startsWith(k));
        const routes = all;
        const hit = key ? routes[key] : new Error("unexpected URL");
        if (hit instanceof Error) throw hit;
        return new Response(hit, { status: 200 });
      }),
    );
  }

  const upscHtml = `<a href="whats-new/National Defence Academy Examination (II), ${new Date().getFullYear()}/Result">Result: NDA II</a>`;

  it("keeps working when sources are down, and names the ones that failed", async () => {
    fakeWeb({ "https://www.upsc.gov.in/": upscHtml, "https://www.mod.gov.in/": new Error("timeout"), "https://pib.gov.in/RssMain": new Error("ECONNRESET") });
    const news = await getDashboardNews();
    expect(news.importantUpdates).toHaveLength(1);
    expect(news.failedSources.sort()).toEqual(["Ministry of Defence", "PIB"]);
  });

  it("treats malformed XML/HTML as empty, not as an error page full of junk", async () => {
    fakeWeb({ "https://www.upsc.gov.in/": "<html><<<", "https://www.mod.gov.in/": "not html", "https://pib.gov.in/RssMain": "<rss><item><title>unterminated" });
    const news = await getDashboardNews();
    expect(news).toMatchObject({ importantUpdates: [], latestArticles: [], failedSources: [] });
  });

  it("uses the English version of a Hindi Defence release", async () => {
    const english = "https://pib.gov.in/PressReleasePage.aspx?PRID=2328040";
    fakeWeb({
      "https://www.upsc.gov.in/": "",
      "https://www.mod.gov.in/": "",
      "https://pib.gov.in/RssMain": pibFeed([{ title: "नौसेना", link: PIB_LINK }]),
      [PIB_LINK]: pibPage({ title: "भारतीय नौसेना की नई प्रणाली", ministry: "रक्षा मंत्रालय" }).replace("</body>", `<a href='/PressReleasePage.aspx?PRID=2328040'>English</a></body>`),
      [english]: pibPage({ title: "Indian Navy's new indigenous system", ministry: "Ministry of Defence", paragraphs: ["The Indian Navy announced an indigenous system today, officials said."] }),
    });
    const { feed } = await getNewsFeed();
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ title: "Indian Navy's new indigenous system", lang: "en", url: english });
  });

  it("counts the whole feed and puts at most CARD_SHOWN items on the dashboard card", async () => {
    const links = Array.from({ length: 9 }, (_, i) => `https://pib.gov.in/PressReleaseIframePage.aspx?PRID=${300 + i}`);
    const routes: Record<string, string> = { "https://www.upsc.gov.in/": upscHtml, "https://www.mod.gov.in/": "", "https://pib.gov.in/RssMain": pibFeed(links.map((l, i) => ({ title: `R${i}`, link: l }))) };
    links.forEach((l, i) => (routes[l] = pibPage({ title: `Army exercise number ${i}`, ministry: "Ministry of Defence" })));
    fakeWeb(routes);
    const news = await getDashboardNews();
    expect(news.totalCount).toBe(10); // 9 PIB + 1 UPSC
    expect(news.latestArticles).toHaveLength(CARD_SHOWN);
  });

  it("shows a PIB defence release in the panel and finds it by id for the reader", async () => {
    fakeWeb({
      "https://www.upsc.gov.in/": upscHtml,
      "https://www.mod.gov.in/": "",
      "https://pib.gov.in/RssMain": pibFeed([{ title: "Navy release", link: PIB_LINK }, { title: "Rail release", link: "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2328002" }]),
      [PIB_LINK]: pibPage({ title: "Navy release", ministry: "Ministry of Defence", paragraphs: ["The Navy announced a new indigenous system today, officials said."] }),
      "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2328002": pibPage({ title: "Rail release", ministry: "Ministry of Railways" }),
    });
    const news = await getDashboardNews();
    // The card shows the whole feed (dated PIB first, then the undated UPSC notice); the Rail release is filtered out.
    expect(news.latestArticles.map((a) => a.title)).toEqual(["Navy release", "Result: NDA II"]);
    const found = await getNewsArticle(newsId(PIB_LINK));
    expect(found).toMatchObject({ title: "Navy release", source: "PIB · Ministry of Defence" });
  });

  it("returns null for unknown ids, and never fetches anything for a malformed id", async () => {
    fakeWeb({ "https://www.upsc.gov.in/": upscHtml, "https://www.mod.gov.in/": "", "https://pib.gov.in/RssMain": pibFeed([]) });
    expect(await getNewsArticle("0000000000000000")).toBeNull();
    vi.mocked(fetch).mockClear();
    expect(await getNewsArticle("https://evil.example/x")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("PIB Ministry of Defence listing and article photos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetNewsCache();
  });

  function fakeWeb(routes: Record<string, string | Error>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        const key = Object.keys(routes).find((k) => input.startsWith(k));
        const hit = key ? routes[key] : new Error("unexpected URL");
        if (hit instanceof Error) throw hit;
        return new Response(hit, { status: 200 });
      }),
    );
  }
  const quiet = { "https://www.upsc.gov.in/": "", "https://www.mod.gov.in/": "", "https://pib.gov.in/RssMain": pibFeed([]) };

  it("reads titles, PRIDs and dates from the listing even though PIB leaves the date <span> unclosed", () => {
    const items = parsePibListing(pibListing([{ prid: 11, title: "Navy &amp; Coast Guard drill", posted: "Posted On: 24 Oct 2026" }, { prid: 12, title: "Army Commanders' Conference", posted: "Posted On: 23 Oct 2026" }]));
    expect(items).toEqual([
      { title: "Navy & Coast Guard drill", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=11", date: "2026-10-24" },
      { title: "Army Commanders' Conference", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=12", date: "2026-10-23" },
    ]);
  });

  it("refuses a listing that isn't filtered to the Ministry of Defence (an ignored postback)", () => {
    expect(parsePibListing(pibListing([{ prid: 1, title: "Rail budget" }], "0"))).toBeNull();
  });

  it("keeps only ASP.NET form-state fields", () => {
    expect(aspNetHiddenFields(`<input type="hidden" name="__VIEWSTATE" value="a" /><input type="hidden" name="evil" value="x" /><input name="__X" value="y" />`)).toEqual({ __VIEWSTATE: "a" });
  });

  it("takes the release's own photo, never the site banner, emblem, another host or a non-image", () => {
    const body = (imgs: string, head = "") => `<html><head>${head}</head><body><img src='https://static.pib.gov.in/WriteReadData/specificdocs/photo/2026/sep/ph_9768.png' alt='azadi ka amrit mahotsav' /><div id="pibReleaseBody">${imgs}</div></body></html>`;
    const photo = "https://static.pib.gov.in/WriteReadData/userfiles/image/2026/oct/PIC(2)_20261024185427_dd5736.JPG";
    expect(releaseImage(body(`<p><img alt="" src="${photo}" style="height:400px" /></p>`))).toBe(photo);
    expect(releaseImage(body(`<img src="https://evil.example/WriteReadData/userfiles/image/a.jpg">`))).toBeNull();
    expect(releaseImage(body(`<img src="http://static.pib.gov.in/WriteReadData/userfiles/image/a.jpg">`))).toBeNull();
    expect(releaseImage(body(`<img src="https://static.pib.gov.in/WriteReadData/userfiles/image/doc.pdf">`))).toBeNull();
    expect(releaseImage(body("", `<meta property="og:image" content="https:/pib.gov.in/images/indian-emblem.png" />`))).toBeNull();
    expect(releaseImage(body("", `<meta property="og:image" content="${photo}" />`))).toBe(photo);
    expect(isAllowedNewsImage(photo)).toBe(true);
    expect(isAllowedNewsImage("https://static.pib.gov.in/images/logo.png")).toBe(false);
  });

  it("adds a month of Defence releases, enriching the newest with excerpt and photo, newest first", async () => {
    const photo = "https://static.pib.gov.in/WriteReadData/userfiles/image/2026/oct/a.jpg";
    fakeWeb({
      ...quiet,
      [PIB_LISTING]: pibListing([
        { prid: 21, title: "INS ship visits port" },
        { prid: 22, title: "Older Army release", posted: "Posted On: 01 Jan 2020" },
        { prid: 23, title: "Air Force exercise" },
      ]),
      [releaseUrl(21)]: pibPage({ title: "INS ship visits port", ministry: "Ministry of Defence", paragraphs: ["The ship arrived on a goodwill visit, the Navy said."] }).replace(`<div id="PdfDiv">`, `<div id="PdfDiv"><img src="${photo}" />`),
      [releaseUrl(23)]: new Error("timeout"),
    });
    const { feed, failedSources } = await getNewsFeed();
    expect(failedSources).toEqual([]);
    expect(feed.map((a) => a.title)).toEqual(["INS ship visits port", "Air Force exercise"]); // stale 2020 item dropped
    expect(feed[0]).toMatchObject({ source: "PIB · Ministry of Defence", image: photo, excerpt: ["The ship arrived on a goodwill visit, the Navy said."] });
    // A release page that fails keeps its listing entry (title + date), without inventing a summary.
    expect(feed[1]).toMatchObject({ image: null, summary: null, excerpt: null });
    expect(feed[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("merges the listing with the RSS copy of the same release (one PRID → one item)", async () => {
    fakeWeb({
      ...quiet,
      "https://pib.gov.in/RssMain": pibFeed([{ title: "Navy release", link: "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=31" }]),
      "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=31": pibPage({ title: "Navy release", ministry: "Ministry of Defence" }),
      [PIB_LISTING]: pibListing([{ prid: 31, title: "Navy release" }]),
      [releaseUrl(31)]: pibPage({ title: "Navy release", ministry: "Ministry of Defence" }),
    });
    const { feed } = await getNewsFeed();
    expect(feed).toHaveLength(1);
  });

  it("reports the listing as failed (others still shown) when PIB rejects the postback", async () => {
    fakeWeb({ ...quiet, "https://www.upsc.gov.in/": `<a href="whats-new/National Defence Academy Examination (II), ${new Date().getFullYear()}/Result">Result: NDA II</a>`, [PIB_LISTING]: new Error("ECONNRESET") });
    const { feed, failedSources } = await getNewsFeed();
    expect(failedSources).toEqual(["PIB Defence releases"]);
    expect(feed.map((a) => a.source)).toEqual(["UPSC"]);
  });

  it("caches the catalog: a second render doesn't refetch, and a total outage keeps the last good copy", async () => {
    fakeWeb({ ...quiet, [PIB_LISTING]: pibListing([{ prid: 41, title: "Army release" }]), [releaseUrl(41)]: pibPage({ title: "Army release", ministry: "Ministry of Defence" }) });
    const first = await getNewsFeed();
    const calls = vi.mocked(fetch).mock.calls.length;
    const again = await getNewsFeed();
    expect(vi.mocked(fetch).mock.calls.length).toBe(calls);
    expect(again.feed).toEqual(first.feed);
  });
});

describe("cleanText entities", () => {
  it("decodes typographic and hex entities PIB summaries use", () => {
    expect(cleanText("Indian Navy&rsquo;s &ldquo;Swavlamban&rdquo; &ndash; 2026&hellip; &#x2019;")).toBe("Indian Navy’s “Swavlamban” – 2026… ’");
  });
});
