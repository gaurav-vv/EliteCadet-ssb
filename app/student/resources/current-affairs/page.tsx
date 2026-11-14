import type { Metadata } from "next";
import { NewsBrowser, type NewsBrowserParams } from "@/components/student/news-browser";

export const metadata: Metadata = { title: "Daily Current Affairs · Resources" };

// Quick Link → Daily Current Affairs: the same cached official feed as the
// dashboard's Latest Articles & News (lib/api/news.ts — no second fetch),
// grouped by publication date for day-by-day reading.
export default async function CurrentAffairsPage({ searchParams }: { searchParams: Promise<NewsBrowserParams> }) {
  // Called directly (an async server component), so the page resolves to plain JSX.
  return NewsBrowser({
    basePath: "/student/resources/current-affairs",
    params: await searchParams,
    title: "Daily Current Affairs",
    subtitle: "Dated Ministry of Defence releases (via PIB) and UPSC defence-exam notices, newest first. Read the summary here; the full release stays one tap away.",
    back: { href: "/student/resources", label: "Resources" },
    groupByDate: true,
  });
}
