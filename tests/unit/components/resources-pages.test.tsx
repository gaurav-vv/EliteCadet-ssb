// Student Resources pages: every visible link leads somewhere real, search and
// category filters change the list, articles render their full structure, and
// videos play inside the app only when the student asks.
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

import ResourcesPage from "@/app/student/resources/page";
import ResourceDetailPage from "@/app/student/resources/[slug]/page";
import ResourceCategoryPage from "@/app/student/resources/category/[category]/page";
import DownloadsPage from "@/app/student/resources/downloads/page";
import VideosPage from "@/app/student/resources/videos/page";
import ReadingPage from "@/app/student/resources/reading/page";
import { getResources } from "@/lib/api/resources";

const main = async (params: Record<string, string> = {}) => render(await ResourcesPage({ searchParams: Promise.resolve(params) }));
const hrefs = (root: HTMLElement) => within(root).getAllByRole("link").map((l) => l.getAttribute("href"));

describe("/student/resources", () => {
  it("opens with search, then the category tabs — no banner, no second heading row — then Featured", async () => {
    const { container } = await main();
    // The "Resources" h1 is in the workspace header on this page (workspace-header.test.tsx).
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    const search = screen.getByRole("search", { name: "Search resources" });
    const tabs = screen.getByRole("navigation", { name: "Resource categories" });
    const featured = screen.getByRole("region", { name: "Featured Resources" });
    expect(search.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tabs.compareDocumentPosition(featured) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('img[src*="hero-cadets"]')).toBeNull();
    expect(screen.queryByText(/prepare better/i)).not.toBeInTheDocument();
  });

  it("puts the search bar directly above the tabs, keeping the category and sort", async () => {
    await main({ q: "tat", category: "psychology-tests", sort: "title" });
    const search = screen.getByRole("search", { name: "Search resources" });
    const tabs = screen.getByRole("navigation", { name: "Resource categories" });
    expect(search.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(tabs).getAllByRole("link")[0]).toHaveTextContent("All");
    expect(search).toHaveAttribute("action", "/student/resources");
    expect(within(search).getByRole("searchbox", { name: "Search resources" })).toHaveValue("tat");
    const hidden = Object.fromEntries([...search.querySelectorAll('input[type="hidden"]')].map((i) => [i.getAttribute("name"), i.getAttribute("value")]));
    expect(hidden).toEqual({ category: "psychology-tests", sort: "title" });
  });

  it("puts the category tabs in a full-width row above both columns, so the sidebar starts below them", async () => {
    await main();
    const tabs = screen.getByRole("navigation", { name: "Resource categories" });
    const sidebar = screen.getByRole("complementary", { name: "Resource shortcuts" });
    // The grid that holds the sidebar holds the library column, not the search or the tabs.
    const grid = sidebar.parentElement!;
    expect(grid.contains(tabs)).toBe(false);
    expect(grid.contains(screen.getByRole("search", { name: "Search resources" }))).toBe(false);
    expect(grid.contains(screen.getByRole("region", { name: "Featured Resources" }))).toBe(true);
    expect(tabs.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const names = within(tabs).getAllByRole("link").map((l) => l.textContent?.trim());
    expect(names).toEqual(["All", "Psychology Tests", "Interview Preparation", "Group Tasks", "Current Affairs", "Exam Guidance", "Tips & Strategies"]);
    expect(within(tabs).getByRole("link", { name: "Exam Guidance" })).toHaveAttribute("href", "/student/resources?category=exam-guidance");
  });

  it("never shows a resource twice on the page: Featured, the list below and Popular are disjoint", async () => {
    await main();
    const hrefsIn = (name: string) => within(screen.getByRole("region", { name })).getAllByRole("link").map((l) => l.getAttribute("href"));
    const featured = hrefsIn("Featured Resources").filter((h) => h !== "#all-resources");
    const list = hrefsIn("All Resources");
    const popular = hrefsIn("Popular Resources");
    expect(featured).toHaveLength(4);
    for (const h of featured) {
      expect(list).not.toContain(h);
      expect(popular).not.toContain(h);
    }
    expect(screen.getByText(/plus 4 featured above/)).toBeInTheDocument();
  });

  it("uses real photos with attribution, never the old illustrations", async () => {
    const { container } = await main();
    const imgs = [...container.querySelectorAll("img")].map((i) => decodeURIComponent(i.getAttribute("src") ?? ""));
    expect(imgs.length).toBeGreaterThan(0);
    for (const src of imgs) expect(src).toMatch(/\/images\/resources\/[a-z0-9-]+\.jpg/);
    expect(container.querySelector('svg[viewBox="0 0 320 180"]')).toBeNull();
    expect(screen.getByText("Photo credits")).toBeInTheDocument();
  });

  it("shows the replacement (people-free) thumbnails for the TAT and Self Description cards, never the old files", async () => {
    // Page 3 lists the whole library (Featured + every remaining card).
    const { container } = await main({ page: "3" });
    const srcOf = (slug: string) => {
      const card = container.querySelector(`li a[href="/student/resources/${slug}"]`)?.closest("li");
      return decodeURIComponent(card?.querySelector("img")?.getAttribute("src") ?? "");
    };
    expect(srcOf("understanding-tat")).toContain("/images/resources/understanding-tat-story-notebook.jpg");
    expect(srcOf("sdt-honest-self-description")).toContain("/images/resources/sdt-self-description-journal.jpg");
    const all = [...container.querySelectorAll("img")].map((i) => decodeURIComponent(i.getAttribute("src") ?? ""));
    expect(all.some((s) => /\/understanding-tat\.jpg|\/sdt-honest-self-description\.jpg/.test(s))).toBe(false);
  });

  it("shows Quick Links, Popular Resources and Resource Categories, each pointing at a working page", async () => {
    await main();
    const shortcuts = screen.getByRole("complementary", { name: "Resource shortcuts" });
    const links = hrefs(shortcuts);
    for (const href of ["/student/resources/downloads", "/student/resources/videos", "/student/resources/reading", "/student/resources/current-affairs", "/student/resources/day-2"]) {
      expect(links).toContain(href);
    }
    expect(links.filter((h) => h?.startsWith("/student/resources/category/"))).toHaveLength(6);
    const slugs = new Set(((await getResources()).data ?? []).map((r) => `/student/resources/${r.slug}`));
    const popular = within(screen.getByRole("region", { name: "Popular Resources" })).getAllByRole("link");
    expect(popular).toHaveLength(5);
    for (const l of popular) expect(slugs.has(l.getAttribute("href")!)).toBe(true);
  });

  it("shows four featured articles and the first page of the library with Load more", async () => {
    await main();
    const featured = within(screen.getByRole("region", { name: "Featured Resources" })).getAllByRole("listitem");
    expect(featured).toHaveLength(4);
    expect(within(screen.getByRole("region", { name: "Featured Resources" })).getByRole("link", { name: /Understanding the TAT/ })).toHaveAttribute("href", "/student/resources/understanding-tat");
    expect(screen.getByRole("link", { name: "Load more" })).toHaveAttribute("href", "/student/resources?page=2");
  });

  it("filters by category chip and by search, and explains an empty search", async () => {
    const { unmount } = await main({ category: "group-tasks" });
    expect(screen.getByRole("link", { name: "Group Tasks", current: "page" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Featured Resources" })).not.toBeInTheDocument();
    const list = within(screen.getByRole("region", { name: "Group Tasks" })).getAllByText("Group Tasks", { selector: "span" });
    expect(list.length).toBeGreaterThan(0);
    unmount();
    await main({ q: "qwertyuiop" });
    expect(screen.getByText("No resources match “qwertyuiop”")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Show all resources" })).toHaveAttribute("href", "/student/resources");
  });
});

describe("article page", () => {
  it("renders breadcrumb, objectives, table of contents, exercises, takeaways, PDF and related links", async () => {
    render(await ResourceDetailPage({ params: Promise.resolve({ slug: "understanding-tat" }) }));
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(hrefs(crumbs)).toEqual(["/student/resources", "/student/resources/category/psychology-tests"]);
    expect(screen.getByRole("heading", { level: 1, name: "Understanding the TAT" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What you will learn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Practice exercises" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Key takeaways" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "On this page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download as PDF/ })).toHaveAttribute("href", "/student/resources/downloads/understanding-tat");
    expect(within(screen.getByRole("navigation", { name: "Previous and next resources" })).getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("404s an unknown slug", async () => {
    await expect(ResourceDetailPage({ params: Promise.resolve({ slug: "does-not-exist" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("category pages", () => {
  it("lists that category's articles with a way back", async () => {
    render(await ResourceCategoryPage({ params: Promise.resolve({ category: "current-affairs" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Current Affairs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /All resources/ })).toHaveAttribute("href", "/student/resources");
    // Daily Current Affairs is reached through its Quick Link only (no duplicate banner).
    const toAffairs = screen.getAllByRole("link", { name: /Daily Current Affairs/ });
    expect(toAffairs).toHaveLength(1);
    expect(toAffairs[0]).toHaveAttribute("href", "/student/resources/current-affairs");
  });

  it("404s an unknown category", async () => {
    await expect(ResourceCategoryPage({ params: Promise.resolve({ category: "nope" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("Quick Link pages", () => {
  it("Downloadable PDFs: every download points at the PDF route", async () => {
    render(await DownloadsPage());
    const downloads = screen.getAllByRole("link").filter((l) => l.hasAttribute("download"));
    expect(downloads.length).toBeGreaterThanOrEqual(6 + PRESERVED_MIN);
    for (const d of downloads) expect(d.getAttribute("href")).toMatch(/^\/student\/resources\/downloads\/[a-z0-9-]+$/);
  });

  it("Videos: filters by topic and loads the player only on click", async () => {
    render(await VideosPage({ searchParams: Promise.resolve({ category: "group-tasks" }) }));
    expect(document.querySelector("iframe")).toBeNull();
    const play = screen.getAllByRole("button", { name: /^Play video:/ });
    expect(play.length).toBeGreaterThan(0);
    fireEvent.click(play[0]);
    const iframe = document.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1/);
  });

  it("Recommended Reading: explains each item and links official sources, without re-listing library articles", () => {
    render(ReadingPage());
    expect(screen.queryByRole("heading", { name: "Read in EliteCadet" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Official sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upsc\.gov\.in/ })).toHaveAttribute("target", "_blank");
  });
});

const PRESERVED_MIN = 6;
