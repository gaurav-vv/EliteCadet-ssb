import { describe, expect, it } from "vitest";
import {
  cleanText,
  mergeArticles,
  parseArticleFeed,
  parseModNews,
  parseOgImage,
  parsePubDate,
  parseSourceDate,
  parseUpscNews,
  pickArticles,
  safeUrl,
} from "@/lib/api/news";

const modRow = (title: string, date: string, href: string) => `<tr>
<td class="views-field views-field-title">${title}   </td>
<td class="views-field views-field-field-start-date">${date}   </td>
<td class="views-field views-field-nothing"><a href="${href}" target="_blank">Download</a></td></tr>`;

describe("news parsing", () => {
  it("parses relevant MoD rows with real dates and skips irrelevant ones", () => {
    const html = modRow("Independence Day &ndash; Gallantry Awards", "14-08-2026", "/sites/default/files/a.pdf")
      + modRow("Organization of Blood Donation Camp", "17-09-2026", "/sites/default/files/b.pdf");
    const out = parseModNews(html);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ date: "2026-08-14", url: "https://www.mod.gov.in/sites/default/files/a.pdf" });
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
  });

  it("validates dates, strips tags, dedupes and sorts newest first", () => {
    expect(parseSourceDate("31-02-2026")).toBeNull();
    expect(cleanText("<b>A &amp; B</b>")).toBe("A & B");
    const a = { title: "a", url: "https://www.mod.gov.in/a", date: "2026-01-01", source: "s", category: "Official Update" as const, summary: null, image: null };
    const b = { ...a, title: "b", url: "https://www.mod.gov.in/b", date: "2026-02-01" };
    expect(mergeArticles([[a, b], [a]]).map((x) => x.title)).toEqual(["b", "a"]);
  });

  it("parses article feeds, rejecting off-host links, and formats IST dates", () => {
    const xml = `<item><title>Tips &#8211; SSB</title><link>https://www.ssbcrack.com/a</link>
      <pubDate>Sat, 03 Oct 2026 20:00:00 +0000</pubDate><category><![CDATA[SSB Interview]]></category>
      <description><![CDATA[<p>A long enough summary about the interview.</p>]]></description></item>
      <item><title>Bad</title><link>https://evil.example/x</link><pubDate>Sat, 03 Oct 2026 20:00:00 +0000</pubDate></item>`;
    const out = parseArticleFeed(xml, "SSBCrack");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ title: "Tips – SSB", category: "SSB Preparation", date: "2026-10-04" });
    expect(parsePubDate("garbage")).toBeNull();
  });

  it("accepts only same-publisher https og:image", () => {
    const tag = (u: string) => `<meta property="og:image" content="${u}" />`;
    expect(parseOgImage(tag("https://media.ssbcrack.com/x.webp"))).toBe("https://media.ssbcrack.com/x.webp");
    expect(parseOgImage(tag("https://other.example/x.webp"))).toBeNull();
    expect(parseOgImage(tag("http://ssbcrack.com/x.webp"))).toBeNull();
  });

  it("never repeats an excluded url or title when picking articles", () => {
    const mk = (n: string, url = `https://www.ssbcrack.com/${n}`) => ({
      title: n, url, date: "2026-10-01", source: "s", category: "Article" as const, summary: null, image: null,
    });
    const out = pickArticles([[mk("a"), mk("b")], [mk("b", "https://www.ssbcrack.com/b2"), mk("c")]], new Set(["https://www.ssbcrack.com/a"]));
    expect(out.map((x) => x.title).sort()).toEqual(["b", "c"]);
  });
});
