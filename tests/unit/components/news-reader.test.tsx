// Dashboard news UI: selecting an item stays inside EliteCadet (/student/news/[id]),
// untrusted feed text renders as text, empty/unavailable states are distinct,
// and the reader shows only attributed, labelled content with the official
// page as a separate, optional link.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { NewsArticle } from "@/types/news";

vi.mock("@/lib/api/news", async (importActual) => ({ ...(await importActual<typeof import("@/lib/api/news")>()), getNewsArticle: vi.fn(), getNewsFeed: vi.fn() }));

import { getNewsArticle, getNewsFeed } from "@/lib/api/news";
import StudentNewsListPage from "@/app/student/news/page";
import { LatestNewsPanel } from "@/components/student/latest-news-panel";
import { NewsTicker } from "@/components/student/news-ticker";
import StudentNewsPage from "@/app/student/news/[id]/page";

const pib: NewsArticle = {
  id: "0123456789abcdef",
  title: "Indian Navy inducts indigenous AIP system",
  url: "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=2328001",
  date: "2026-10-24",
  source: "PIB · Ministry of Defence",
  category: "Defence News",
  summary: "The Indian Navy reached a milestone…",
  excerpt: ["The Indian Navy reached a milestone in underwater endurance today.", "The system was developed indigenously."],
  lang: "en",
  image: null,
};
const upsc: NewsArticle = { ...pib, id: "fedcba9876543210", title: "Written Result: NDA (II) 2026", url: "https://www.upsc.gov.in/whats-new/x", date: null, source: "UPSC", category: "Exam Update", summary: null, excerpt: null };

describe("LatestNewsPanel", () => {
  it("links every item to the in-app reader — no new tab, no publisher URL", () => {
    render(<LatestNewsPanel articles={[pib, upsc]} />);
    const links = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/student/news/"));
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/student/news/0123456789abcdef", "/student/news/fedcba9876543210"]);
    for (const l of links) {
      expect(l).not.toHaveAttribute("target");
      expect(l.getAttribute("href")).not.toMatch(/^https?:/);
    }
    expect(screen.getByText("PIB · Ministry of Defence")).toBeInTheDocument();
    expect(screen.getByText(/24 Oct 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/ssbcrack|third-party/i)).toBeNull();
  });

  it("renders hostile feed text as plain text, never as markup", () => {
    const { container } = render(<LatestNewsPanel articles={[{ ...pib, title: '<img src=x onerror="alert(1)">Army drill' }]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText('<img src=x onerror="alert(1)">Army drill')).toBeInTheDocument();
  });

  it("labels Hindi releases and marks their language", () => {
    render(<LatestNewsPanel articles={[{ ...pib, title: "भारतीय नौसेना", lang: "hi" }]} />);
    expect(screen.getByText("हिन्दी")).toBeInTheDocument();
    expect(screen.getByText("भारतीय नौसेना")).toHaveAttribute("lang", "hi");
  });

  it("links to the full list with the real total", () => {
    render(<LatestNewsPanel articles={[pib, upsc]} totalCount={14} />);
    expect(screen.getByRole("link", { name: "View all news (14)" })).toHaveAttribute("href", "/student/news");
  });

  it("distinguishes 'nothing new' from 'sources unavailable', and never shows placeholder news", () => {
    const { rerender } = render(<LatestNewsPanel articles={[]} />);
    expect(screen.getByText("No new defence updates")).toBeInTheDocument();
    rerender(<LatestNewsPanel articles={[]} unavailable />);
    expect(screen.getByText("News sources are unavailable")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("NewsTicker", () => {
  it("opens the in-app reader instead of the publisher in a new tab", () => {
    render(<NewsTicker articles={[upsc]} />);
    const link = screen.getByRole("link", { name: upsc.title });
    expect(link).toHaveAttribute("href", "/student/news/fedcba9876543210");
    expect(link).not.toHaveAttribute("target");
  });
});

describe("/student/news/[id] reader", () => {
  it("shows headline, attribution, date and the labelled excerpt; the official page is a separate, optional link", async () => {
    vi.mocked(getNewsArticle).mockResolvedValue(pib);
    render(await StudentNewsPage({ params: Promise.resolve({ id: pib.id }) }));
    expect(screen.getByRole("heading", { level: 1, name: pib.title })).toBeInTheDocument();
    expect(screen.getByText("Excerpt from the official release")).toBeInTheDocument();
    expect(screen.getByText(pib.excerpt![0])).toBeInTheDocument();
    expect(screen.getByText(/24 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute("href", "/student");
    const official = screen.getByRole("link", { name: /read the full release on pib\.gov\.in/i });
    expect(official).toHaveAttribute("href", pib.url);
    expect(official).toHaveAttribute("rel", "noopener noreferrer");
    // Never claims the full article is here, and never embeds the publisher.
    expect(screen.queryByText(/full article (is )?available here/i)).toBeNull();
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("is honest when only a title is available (official document on the source site)", async () => {
    vi.mocked(getNewsArticle).mockResolvedValue(upsc);
    render(await StudentNewsPage({ params: Promise.resolve({ id: upsc.id }) }));
    expect(screen.getByText(/published as a document on upsc\.gov\.in/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open the official notice on upsc\.gov\.in/i })).toBeInTheDocument();
  });

  it("shows a graceful empty state for an unknown or expired item", async () => {
    vi.mocked(getNewsArticle).mockResolvedValue(null);
    render(await StudentNewsPage({ params: Promise.resolve({ id: "0000000000000000" }) }));
    expect(screen.getByText("This news item isn't available")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to dashboard/i })).toBeInTheDocument();
  });
});

describe("/student/news list", () => {
  const many: NewsArticle[] = Array.from({ length: 14 }, (_, i) => ({
    ...pib,
    id: i.toString(16).padStart(16, "0"),
    title: i < 4 ? `NDA result notice ${i}` : `Navy update ${i}`,
    url: `https://pib.gov.in/PressReleasePage.aspx?PRID=${i + 1}`,
    category: i < 4 ? "Exam Update" : "Defence News",
  }));
  const page = async (params: Record<string, string> = {}) => render(await StudentNewsListPage({ searchParams: Promise.resolve(params) }));

  it("shows the first 10 of 14 with a Load more link, each opening the in-app reader", async () => {
    vi.mocked(getNewsFeed).mockResolvedValue({ feed: many, failedSources: [], fetchedAt: "2026-10-25T08:00:00Z" });
    await page();
    expect(screen.getByText("Showing 10 of 14")).toBeInTheDocument();
    const items = screen.getAllByRole("link").filter((l) => l.getAttribute("href")?.startsWith("/student/news/"));
    expect(items).toHaveLength(10);
    for (const l of items) expect(l).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "Load more" })).toHaveAttribute("href", "/student/news?page=2");
  });

  it("filters by category (with counts) and by search, keeping filters in Load more", async () => {
    vi.mocked(getNewsFeed).mockResolvedValue({ feed: many, failedSources: [], fetchedAt: "2026-10-25T08:00:00Z" });
    await page({ category: "Exam Update" });
    expect(screen.getByText("Showing 4 of 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Exam Updates (4)" })).toHaveAttribute("aria-current", "page");
    // Categories no source currently fills are hidden rather than shown as (0).
    expect(screen.queryByRole("link", { name: "Current Affairs (0)" })).not.toBeInTheDocument();
  });

  it("shows a search empty state, and an error state when every source is down", async () => {
    vi.mocked(getNewsFeed).mockResolvedValue({ feed: many, failedSources: [], fetchedAt: "2026-10-25T08:00:00Z" });
    const { unmount } = await page({ q: "submarine" });
    expect(screen.getByText("No news matches “submarine”")).toBeInTheDocument();
    unmount();
    vi.mocked(getNewsFeed).mockResolvedValue({ feed: [], failedSources: ["PIB", "UPSC"], fetchedAt: "2026-10-25T08:00:00Z" });
    await page();
    expect(screen.getByText("News sources are unavailable")).toBeInTheDocument();
  });

  it("says which sources were unreachable while showing the rest", async () => {
    vi.mocked(getNewsFeed).mockResolvedValue({ feed: many.slice(0, 3), failedSources: ["PIB"], fetchedAt: "2026-10-25T08:00:00Z" });
    await page();
    expect(screen.getByRole("status")).toHaveTextContent("Couldn't reach PIB just now; showing the rest.");
  });
});
