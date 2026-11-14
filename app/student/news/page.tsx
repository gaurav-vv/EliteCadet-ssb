import type { Metadata } from "next";
import { NewsBrowser, type NewsBrowserParams } from "@/components/student/news-browser";

export const metadata: Metadata = { title: "News" };

// All official news for students: categories, search and "Load more", all
// rendered on the server from the cached feed (lib/api/news.ts). Every item
// opens in the in-app reader. Shares NewsBrowser with Daily Current Affairs.
export default async function StudentNewsListPage({ searchParams }: { searchParams: Promise<NewsBrowserParams> }) {
  // Called directly (an async server component), so the page resolves to plain JSX.
  return NewsBrowser({
    basePath: "/student/news",
    params: await searchParams,
    title: "News",
    subtitle: "Defence announcements and exam updates from official sources: PIB (Ministry of Defence), UPSC and the Ministry of Defence.",
    back: { href: "/student", label: "Dashboard" },
  });
}
