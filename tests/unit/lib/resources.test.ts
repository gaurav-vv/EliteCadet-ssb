// @vitest-environment node
// Student Resources library (lib/api/resources.ts + lib/content/resources):
// content integrity, preserved URLs, search/filter/sort/paging, and real PDFs.
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAdjacentResources,
  getCategoryCounts,
  getEditorsPicks,
  getFeaturedResources,
  getPrintables,
  getReadingList,
  getRelatedResources,
  getResource,
  getResources,
  getVideos,
  queryResources,
  RESOURCES_PAGE_SIZE,
  CATEGORY_SLUGS,
  categoryFromSlug,
} from "@/lib/api/resources";
import { articlePdf, printablePdf } from "@/lib/pdf/resource-pdf";
import { renderPdf, wrapText } from "@/lib/pdf/simple-pdf";
import { GET as downloadPdf } from "@/app/student/resources/downloads/[slug]/route";
import { RESOURCE_CATEGORIES } from "@/types/resources";

const PRESERVED = [
  "understanding-tat",
  "wat-response-habits",
  "srt-decisiveness",
  "sdt-honest-self-description",
  "interview-day-checklist",
  "staying-consistent-across-tests",
];

describe("resource library content", async () => {
  const all = (await getResources()).data!;

  it("keeps every existing resource URL", async () => {
    for (const slug of PRESERVED) expect((await getResource(slug)).ok, slug).toBe(true);
  });

  it("has unique, URL-safe slugs that don't collide with the Resources sub-pages", () => {
    const slugs = all.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const reserved of ["downloads", "videos", "reading", "current-affairs", "category", "day-2"]) expect(slugs).not.toContain(reserved);
  });

  it("fills every category with several substantive articles", async () => {
    const counts = getCategoryCounts();
    for (const c of RESOURCE_CATEGORIES) expect(counts[c], c).toBeGreaterThanOrEqual(2);
    for (const r of all) {
      const d = (await getResource(r.slug)).data!;
      expect(d.readingMinutes, d.slug).toBeGreaterThanOrEqual(3);
      expect(d.sections.length, d.slug).toBeGreaterThanOrEqual(3);
      expect(d.objectives.length, d.slug).toBeGreaterThan(0);
      expect(d.takeaways.length, d.slug).toBeGreaterThan(0);
      expect(new Set(d.sections.map((s) => s.id)).size, `${d.slug} section ids`).toBe(d.sections.length);
      expect(d.updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("never promises an SSB outcome", async () => {
    for (const r of all) {
      const text = JSON.stringify((await getResource(r.slug)).data);
      expect(text, r.slug).not.toMatch(/you will (be selected|get selected|fail)|guaranteed selection/i);
    }
  });

  it("links Popular, Featured, videos and related reading only to real articles", async () => {
    const slugs = new Set(all.map((r) => r.slug));
    expect(getEditorsPicks()).toHaveLength(5);
    expect(getFeaturedResources()).toHaveLength(4);
    for (const v of getVideos()) {
      expect(v.youtubeId).toMatch(/^[\w-]{11}$/);
      if (v.relatedSlug) expect(slugs.has(v.relatedSlug), v.relatedSlug).toBe(true);
    }
    for (const item of getReadingList()) if (item.url) expect(item.url).toMatch(/^https:\/\//);
  });

  it("gives related and previous/next resources, never the article itself", () => {
    expect(getRelatedResources("understanding-tat").map((r) => r.slug)).not.toContain("understanding-tat");
    expect(getAdjacentResources(all[0].slug).previous).toBeNull();
    expect(getAdjacentResources(all[1].slug).previous?.slug).toBe(all[0].slug);
    expect(getAdjacentResources(all[all.length - 1].slug).next).toBeNull();
  });

  it("maps category slugs both ways and rejects unknown ones", () => {
    for (const c of RESOURCE_CATEGORIES) expect(categoryFromSlug(CATEGORY_SLUGS[c])).toBe(c);
    expect(categoryFromSlug("../etc")).toBeNull();
    expect(categoryFromSlug(undefined)).toBeNull();
  });
});

describe("one canonical record per resource, no repeated information", async () => {
  const all = (await getResources()).data!;

  it("keeps Popular picks and Featured disjoint, all pointing at canonical library slugs", () => {
    const featured = getFeaturedResources().map((r) => r.slug);
    const picks = getEditorsPicks().map((r) => r.slug);
    expect(picks.filter((s) => featured.includes(s))).toEqual([]);
    for (const s of [...featured, ...picks]) expect(all.some((r) => r.slug === s)).toBe(true);
  });

  it("can leave already-shown resources out of the list", () => {
    const featured = getFeaturedResources().map((r) => r.slug);
    const rest = queryResources({ excludeSlugs: featured, page: 20 });
    expect(rest.total).toBe(all.length - featured.length);
    expect(rest.items.some((r) => featured.includes(r.slug))).toBe(false);
  });

  it("does not repeat previous/next inside Related", () => {
    for (const r of all) {
      const { previous, next } = getAdjacentResources(r.slug);
      const related = getRelatedResources(r.slug, 4).map((x) => x.slug);
      if (previous) expect(related).not.toContain(previous.slug);
      if (next) expect(related).not.toContain(next.slug);
    }
  });

  it("does not repeat the same block of official links across articles", async () => {
    const seen = new Map<string, string>();
    for (const r of all) {
      const links = ((await getResource(r.slug)).data!.officialLinks ?? []).map((l) => l.url).sort();
      if (links.length < 2) continue;
      const key = links.join(" ");
      expect(seen.get(key), `${r.slug} repeats ${seen.get(key)}`).toBeUndefined();
      seen.set(key, r.slug);
    }
  });

  it("gives every article its own real photograph, on disk, with licence and source", () => {
    expect(new Set(all.map((r) => r.photo.src)).size).toBe(all.length);
    for (const r of all) {
      expect(r.photo.src).toMatch(/^\/images\/resources\/[a-z0-9-]+\.jpg$/);
      expect(existsSync(path.join(process.cwd(), "public", r.photo.src))).toBe(true);
      expect(r.photo.license).toMatch(/^(Public domain|CC0|CC BY(-SA)? [0-9.]+|GODL-India)$/);
      expect(r.photo.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(r.photo.author.length).toBeGreaterThan(0);
      expect(r.photo.alt.length).toBeGreaterThan(10);
      if (/^CC BY/.test(r.photo.license)) expect(r.photo.licenseUrl).toMatch(/^https?:\/\//);
    }
  });
});

describe("queryResources — search, category filter, sort, Load more", () => {
  it("searches titles, descriptions, categories and headings (all words must match)", () => {
    expect(queryResources({ q: "TAT" }).items.map((r) => r.slug)).toContain("understanding-tat");
    expect(queryResources({ q: "lecturette" }).items.map((r) => r.slug)).toContain("lecturette-preparation");
    expect(queryResources({ q: "zzzz-nothing" }).total).toBe(0);
  });

  it("filters by category", () => {
    const { items } = queryResources({ category: "Group Tasks", page: 5 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((r) => r.category === "Group Tasks")).toBe(true);
  });

  it("pages with Load more and tolerates junk page/sort values", () => {
    const first = queryResources({});
    expect(first.items).toHaveLength(RESOURCES_PAGE_SIZE);
    expect(first.hasMore).toBe(true);
    const second = queryResources({ page: 2 });
    expect(second.items).toHaveLength(Math.min(first.total, RESOURCES_PAGE_SIZE * 2));
    expect(queryResources({ page: Number.NaN, sort: "<script>" })).toMatchObject({ page: 1, sort: "latest" });
  });

  it("sorts by title and by reading time", () => {
    const byTitle = queryResources({ sort: "title", page: 20 }).items.map((r) => r.title);
    expect(byTitle).toEqual([...byTitle].sort((a, b) => a.localeCompare(b)));
    const quick = queryResources({ sort: "quick", page: 20 }).items.map((r) => r.readingMinutes);
    expect(quick).toEqual([...quick].sort((a, b) => a - b));
  });
});

describe("PDF downloads", () => {
  const text = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

  it("writes a structurally valid PDF with a correct xref table", () => {
    const pdf = text(renderPdf({ title: "T (1)", footer: "f", blocks: [{ type: "title", text: "Hello (world) \\ – ok" }, { type: "check", text: "Tick" }] }));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    const startxref = Number(pdf.match(/startxref\n(\d+)/)![1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    // Each xref offset points at "N 0 obj".
    const offsets = [...pdf.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    offsets.forEach((o, i) => expect(pdf.slice(o, o + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
    expect(pdf).toContain("(Hello \\(world\\) \\\\ \\226 ok)");
  });

  it("wraps long lines inside the page width", () => {
    const lines = wrapText("word ".repeat(200), 10.5, false, 480);
    expect(lines.length).toBeGreaterThan(5);
  });

  it("renders every printable and every article, multi-page where needed", async () => {
    for (const d of getPrintables()) expect(text(printablePdf(d))).toContain("/Type /Catalog");
    for (const r of (await getResources()).data!) {
      const pdf = text(articlePdf((await getResource(r.slug)).data!));
      expect(Number(pdf.match(/\/Count (\d+)/)![1]), r.slug).toBeGreaterThanOrEqual(1);
    }
  });

  it("serves a PDF attachment for a library slug and 404s anything else", async () => {
    const ok = await downloadPdf(new Request("http://x"), { params: Promise.resolve({ slug: "tat-practice-worksheet" }) });
    expect(ok.status).toBe(200);
    expect(ok.headers.get("content-type")).toBe("application/pdf");
    expect(ok.headers.get("content-disposition")).toBe('attachment; filename="elitecadet-tat-practice-worksheet.pdf"');
    expect(Buffer.from(await ok.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    const article = await downloadPdf(new Request("http://x"), { params: Promise.resolve({ slug: "understanding-tat" }) });
    expect(article.status).toBe(200);
    for (const slug of ["nope", "../../etc/passwd", ""]) {
      expect((await downloadPdf(new Request("http://x"), { params: Promise.resolve({ slug }) })).status).toBe(404);
    }
  });
});

describe("every Resources navigation target is a real route", () => {
  const route = (...p: string[]) => path.join(process.cwd(), "app", "student", "resources", ...p);
  it.each([
    ["downloads", "page.tsx"],
    ["downloads", "[slug]", "route.ts"],
    ["videos", "page.tsx"],
    ["reading", "page.tsx"],
    ["current-affairs", "page.tsx"],
    ["category", "[category]", "page.tsx"],
    ["day-2", "page.tsx"],
    ["[slug]", "page.tsx"],
  ])("app/student/resources/%s", (...parts) => {
    expect(existsSync(route(...parts))).toBe(true);
  });
});
