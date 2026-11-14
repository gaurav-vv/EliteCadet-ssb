// The Academy "Resources" section: the same pages and content as the students' Resources, read-only,
// because the platform admin is the only one who provides them. Every link stays inside /academy, nothing
// that belongs to a student (read tracking, Day 2, the in-app news reader) appears, and the data is the same.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }) }));

import AcademyResourcesPage from "@/app/academy/resources/page";
import AcademyResourceDetailPage from "@/app/academy/resources/[slug]/page";
import AcademyResourceCategoryPage from "@/app/academy/resources/category/[category]/page";
import AcademyDownloadsPage from "@/app/academy/resources/downloads/page";
import AcademyVideosPage from "@/app/academy/resources/videos/page";
import AcademyReadingPage from "@/app/academy/resources/reading/page";
import { GET as academyDownload } from "@/app/academy/resources/downloads/[slug]/route";
import { GET as studentDownload } from "@/app/student/resources/downloads/[slug]/route";
import StudentResourcesPage from "@/app/student/resources/page";
import { ACADEMY_NAVIGATION } from "@/lib/academy/navigation";
import { roleForPath } from "@/lib/auth/redirect";
import { getResource } from "@/lib/api/resources";
import { resourcesBase } from "@/lib/resources/paths";
import { READ_RESOURCES_KEY } from "@/lib/student/resource-completion";

const links = (root: HTMLElement = document.body) => within(root).getAllByRole("link").map((l) => l.getAttribute("href") ?? "");
const internal = (hrefs: string[]) => hrefs.filter((h) => h.startsWith("/"));
const home = async (params: Record<string, string> = {}) => render(await AcademyResourcesPage({ searchParams: Promise.resolve(params) }));

beforeEach(() => {
  localStorage.clear();
});

describe("where the academy section lives", () => {
  it("has its own base path and keeps the student one unchanged", () => {
    expect(resourcesBase("academy")).toBe("/academy/resources");
    expect(resourcesBase("student")).toBe("/student/resources");
    expect(resourcesBase()).toBe("/student/resources");
  });

  it("adds Resources to the academy sidebar, next to the existing Library", () => {
    const labels = ACADEMY_NAVIGATION.map((i) => i.label);
    expect(labels).toContain("Resources");
    expect(labels).toContain("Library");
    expect(labels.indexOf("Resources")).toBe(labels.indexOf("Library") - 1);
    expect(ACADEMY_NAVIGATION.find((i) => i.label === "Resources")).toMatchObject({ href: "/academy/resources", availability: "available" });
  });

  it("is protected like the rest of /academy: only an academy admin may open it", () => {
    for (const path of ["/academy/resources", "/academy/resources/understanding-tat", "/academy/resources/downloads/understanding-tat"]) expect(roleForPath(path)).toBe("academy_admin");
  });
});

describe("the academy Resources page", () => {
  it("shows the same layout as students: search, category tabs, featured resources, the full list and shortcuts", async () => {
    await home();
    expect(screen.getByRole("heading", { level: 1, name: "Resources" })).toBeInTheDocument();
    expect(screen.getByRole("search", { name: "Search resources" })).toHaveAttribute("action", "/academy/resources");
    expect(screen.getByRole("navigation", { name: "Resource categories" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Featured Resources" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "All Resources" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Resource shortcuts" })).toBeInTheDocument();
  });

  it("keeps every link inside the academy workspace", async () => {
    await home();
    const hrefs = internal(links());
    expect(hrefs.length).toBeGreaterThan(20);
    expect(hrefs.filter((h) => h.startsWith("/student"))).toEqual([]);
    for (const h of hrefs) expect(h).toMatch(/^\/academy\/resources(\/|\?|#|$)/);
  });

  it("offers PDFs, videos and reading, but not the student-only Day 2 library or the in-app news reader", async () => {
    await home();
    const shortcuts = screen.getByRole("complementary", { name: "Resource shortcuts" });
    const hrefs = links(shortcuts);
    expect(hrefs).toEqual(expect.arrayContaining(["/academy/resources/downloads", "/academy/resources/videos", "/academy/resources/reading"]));
    // The student-only destinations, exactly. (The "Current Affairs" resource CATEGORY is ordinary shared content.)
    expect(hrefs).not.toContain("/academy/resources/day-2");
    expect(hrefs).not.toContain("/academy/resources/current-affairs");
    expect(hrefs.some((h) => h.startsWith("/academy/resources/day-2"))).toBe(false);
    expect(hrefs).toContain("/academy/resources/category/current-affairs");
  });

  it("shows the same resources students see (same data, nothing extra, nothing missing)", async () => {
    const academy = await home();
    const academySlugs = new Set(links(academy.container).map((h) => h.match(/^\/academy\/resources\/([a-z0-9-]+)$/)?.[1]).filter(Boolean));
    academy.unmount();
    const student = render(await StudentResourcesPage({ searchParams: Promise.resolve({}) }));
    const studentSlugs = new Set(links(student.container).map((h) => h.match(/^\/student\/resources\/([a-z0-9-]+)$/)?.[1]).filter(Boolean));
    for (const quick of ["downloads", "videos", "reading", "current-affairs", "day-2"]) studentSlugs.delete(quick);
    for (const quick of ["downloads", "videos", "reading"]) academySlugs.delete(quick);
    expect(academySlugs.size).toBeGreaterThan(5);
    expect([...academySlugs].sort()).toEqual([...studentSlugs].sort());
  });

  it("search and category filters work the same way", async () => {
    await home({ q: "tat" });
    expect(screen.getByText(/matches for “tat”/)).toBeInTheDocument();
    expect(links().some((h) => h === "/academy/resources#all-resources")).toBe(true);
  });

  it("never shows a student's reading progress, even if this browser has some stored", async () => {
    localStorage.setItem(READ_RESOURCES_KEY, JSON.stringify(["understanding-tat"]));
    await home();
    expect(screen.queryByText(/^Read$/)).not.toBeInTheDocument();
  });
});

describe("an academy resource article", () => {
  const open = async (slug = "understanding-tat") => render(await AcademyResourceDetailPage({ params: Promise.resolve({ slug }) }));

  it("renders the full article with its breadcrumb, PDF and neighbours inside /academy", async () => {
    await open();
    expect(screen.getByRole("heading", { level: 1, name: "Understanding the TAT" })).toBeInTheDocument();
    expect(links(screen.getByRole("navigation", { name: "Breadcrumb" }))).toEqual(["/academy/resources", "/academy/resources/category/psychology-tests"]);
    expect(screen.getByRole("link", { name: /Download as PDF/ })).toHaveAttribute("href", "/academy/resources/downloads/understanding-tat");
    expect(internal(links()).filter((h) => h.startsWith("/student"))).toEqual([]);
    expect(within(screen.getByRole("navigation", { name: "Previous and next resources" })).getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("has no 'Mark as read' control: that is a student's own progress", async () => {
    await open();
    expect(screen.queryByRole("button", { name: /mark as read|marked as read/i })).not.toBeInTheDocument();
  });

  it("404s an unknown article", async () => {
    await expect(AcademyResourceDetailPage({ params: Promise.resolve({ slug: "does-not-exist" }) })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("the other academy resource pages", () => {
  it("category page: lists the category and goes back to the academy Resources", async () => {
    render(await AcademyResourceCategoryPage({ params: Promise.resolve({ category: "psychology-tests" }), searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("link", { name: /All resources/ })).toHaveAttribute("href", "/academy/resources");
    expect(internal(links()).filter((h) => h.startsWith("/student"))).toEqual([]);
  });

  it("category page: 404s an unknown category", async () => {
    await expect(AcademyResourceCategoryPage({ params: Promise.resolve({ category: "nope" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("downloads: every PDF link points at the academy download route", async () => {
    render(await AcademyDownloadsPage());
    const downloads = screen.getAllByRole("link").filter((l) => l.hasAttribute("download"));
    expect(downloads.length).toBeGreaterThanOrEqual(6);
    for (const d of downloads) expect(d.getAttribute("href")).toMatch(/^\/academy\/resources\/downloads\/[a-z0-9-]+$/);
    expect(screen.getByRole("link", { name: /Resources/ })).toHaveAttribute("href", "/academy/resources");
  });

  it("videos: filters by topic, links the article to read next inside /academy", async () => {
    render(await AcademyVideosPage({ searchParams: Promise.resolve({ category: "group-tasks" }) }));
    expect(screen.getAllByRole("button", { name: /^Play video:/ }).length).toBeGreaterThan(0);
    expect(internal(links()).filter((h) => h.startsWith("/student"))).toEqual([]);
    for (const h of internal(links())) expect(h).toMatch(/^\/academy\/resources/);
  });

  it("reading: shows the reading list with a way back to the academy Resources", () => {
    render(AcademyReadingPage());
    expect(screen.getByRole("heading", { name: "Official sources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Resources/ })).toHaveAttribute("href", "/academy/resources");
  });
});

describe("PDF downloads", () => {
  const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

  it("serves a real PDF, as an attachment, for a library article", async () => {
    const res = await academyDownload(new Request("http://x"), params("understanding-tat"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain('attachment; filename="elitecadet-understanding-tat.pdf"');
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(new TextDecoder().decode((await res.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
  });

  it("gives academy and student the identical file, and a 404 for anything not in the library", async () => {
    const a = await academyDownload(new Request("http://x"), params("understanding-tat"));
    const s = await studentDownload(new Request("http://x"), params("understanding-tat"));
    expect(Buffer.from(await a.arrayBuffer()).equals(Buffer.from(await s.arrayBuffer()))).toBe(true);
    expect((await academyDownload(new Request("http://x"), params("../../etc/passwd"))).status).toBe(404);
    expect((await academyDownload(new Request("http://x"), params("not-a-resource"))).status).toBe(404);
  });

  it("the article exists for the PDF test above", async () => {
    expect((await getResource("understanding-tat")).ok).toBe(true);
  });
});
