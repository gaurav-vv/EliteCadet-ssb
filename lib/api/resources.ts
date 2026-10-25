// Typed API client for Resources (T037, AGENTS.md §9). Backed by the
// editorial library in lib/content/resources (written for EliteCadet, not
// user data). A CMS can later replace that folder; pages only use this file.

import { CATEGORY_DESCRIPTIONS, CATEGORY_SLUGS, categoryFromSlug, EDITORS_PICKS, LIBRARY } from "@/lib/content/resources";
import { PRINTABLE_DOCS } from "@/lib/content/resources/printables";
import { READING } from "@/lib/content/resources/reading";
import { VIDEOS, VIDEOS_VERIFIED_ON } from "@/lib/content/resources/videos";
import { RESOURCE_CATEGORIES, type PrintableDoc, type ResourceCategory, type ResourceDetail, type ReadingItem, type ResourcePhoto, type ResourceSummary, type ResourceVideo } from "@/types/resources";

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
}

export { CATEGORY_DESCRIPTIONS, CATEGORY_SLUGS, categoryFromSlug };

export const RESOURCES_PAGE_SIZE = 8;

export const RESOURCE_SORTS = [
  { value: "latest", label: "Latest" },
  { value: "title", label: "Title (A–Z)" },
  { value: "quick", label: "Quickest read" },
] as const;
export type ResourceSort = (typeof RESOURCE_SORTS)[number]["value"];

const summary = ({ slug, title, category, description, readingMinutes, updatedOn, photo, featured }: ResourceDetail): ResourceSummary => ({
  slug,
  title,
  category,
  description,
  readingMinutes,
  updatedOn,
  photo,
  featured,
});

export async function getResources(): Promise<ApiResult<ResourceSummary[]>> {
  return { ok: true, data: LIBRARY.map(summary) };
}

export async function getResource(slug: string): Promise<ApiResult<ResourceDetail>> {
  const resource = LIBRARY.find((r) => r.slug === slug);
  return resource ? { ok: true, data: resource } : { ok: false };
}

export interface ResourceQuery {
  q?: string;
  category?: ResourceCategory | null;
  sort?: string;
  page?: number;
  // Already shown elsewhere on the same screen (e.g. Featured).
  excludeSlugs?: string[];
}

export interface ResourceQueryResult {
  items: ResourceSummary[];
  total: number;
  hasMore: boolean;
  page: number;
  sort: ResourceSort;
}

// Search (title, description, category, headings), category filter, sort and
// "Load more": page N shows the first N × RESOURCES_PAGE_SIZE matches.
export function queryResources({ q = "", category = null, sort = "latest", page = 1, excludeSlugs = [] }: ResourceQuery): ResourceQueryResult {
  const terms = q.trim().toLowerCase().slice(0, 80).split(/\s+/).filter(Boolean);
  const safeSort: ResourceSort = RESOURCE_SORTS.some((s) => s.value === sort) ? (sort as ResourceSort) : "latest";
  const matches = LIBRARY.filter((r) => {
    if (excludeSlugs.includes(r.slug)) return false;
    if (category && r.category !== category) return false;
    if (terms.length === 0) return true;
    const haystack = `${r.title} ${r.description} ${r.category} ${r.sections.map((s) => s.heading).join(" ")}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
  const order = (a: ResourceDetail, b: ResourceDetail) =>
    safeSort === "title"
      ? a.title.localeCompare(b.title)
      : safeSort === "quick"
        ? a.readingMinutes - b.readingMinutes
        : b.updatedOn.localeCompare(a.updatedOn);
  // Array.prototype.sort is stable: ties keep library order.
  const sorted = [...matches].sort(order);
  const safePage = Math.max(1, Math.min(Number.isFinite(page) ? Math.floor(page) : 1, 20));
  return {
    items: sorted.slice(0, safePage * RESOURCES_PAGE_SIZE).map(summary),
    total: sorted.length,
    hasMore: sorted.length > safePage * RESOURCES_PAGE_SIZE,
    page: safePage,
    sort: safeSort,
  };
}

export function getFeaturedResources(limit = 4): ResourceSummary[] {
  return LIBRARY.filter((r) => r.featured).slice(0, limit).map(summary);
}

export function getEditorsPicks(): ResourceSummary[] {
  return EDITORS_PICKS.map((slug) => LIBRARY.find((r) => r.slug === slug))
    .filter((r): r is ResourceDetail => Boolean(r))
    .map(summary);
}

export function getCategoryCounts(): Record<ResourceCategory, number> {
  return Object.fromEntries(RESOURCE_CATEGORIES.map((c) => [c, LIBRARY.filter((r) => r.category === c).length])) as Record<ResourceCategory, number>;
}

// Same category first, then the rest of the library — never the article itself
// or its previous/next neighbours, which the article page already links.
export function getRelatedResources(slug: string, limit = 3): ResourceSummary[] {
  const self = LIBRARY.find((r) => r.slug === slug);
  if (!self) return [];
  const { previous, next } = getAdjacentResources(slug);
  const skip = new Set([slug, previous?.slug, next?.slug]);
  const same = LIBRARY.filter((r) => !skip.has(r.slug) && r.category === self.category);
  const other = LIBRARY.filter((r) => !skip.has(r.slug) && r.category !== self.category);
  return [...same, ...other].slice(0, limit).map(summary);
}

// Previous/next in library order (the order of the category pages).
export function getAdjacentResources(slug: string): { previous: ResourceSummary | null; next: ResourceSummary | null } {
  const i = LIBRARY.findIndex((r) => r.slug === slug);
  if (i < 0) return { previous: null, next: null };
  return { previous: i > 0 ? summary(LIBRARY[i - 1]) : null, next: i < LIBRARY.length - 1 ? summary(LIBRARY[i + 1]) : null };
}

// ---- Printable study material (PDF) -------------------------------------------

export function getPrintables(): PrintableDoc[] {
  return PRINTABLE_DOCS;
}

export function getPrintable(slug: string): PrintableDoc | null {
  return PRINTABLE_DOCS.find((d) => d.slug === slug) ?? null;
}

// ---- Curated videos -----------------------------------------------------------

export function getVideos(category?: ResourceCategory | null): ResourceVideo[] {
  return category ? VIDEOS.filter((v) => v.category === category) : VIDEOS;
}

export { VIDEOS_VERIFIED_ON };

// ---- Recommended reading ------------------------------------------------------

export function getReadingList(): ReadingItem[] {
  return READING;
}

// ---- Photo credits ------------------------------------------------------------

// Every photo the library shows, with the article it illustrates (attribution
// for CC BY / CC BY-SA / GODL-India; public-domain and CC0 credited too).
export function getPhotoCredits(): { slug: string; title: string; photo: ResourcePhoto }[] {
  return LIBRARY.map((r) => ({ slug: r.slug, title: r.title, photo: r.photo }));
}
