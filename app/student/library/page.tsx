import type { Metadata } from "next";
import { LibraryList } from "@/components/content/library-view";

export const metadata: Metadata = { title: "Library" };

export default async function StudentLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryList basePath="/student/library" rawParams={await searchParams} subtitle="Material published for students — by the platform, your academy or your batch." />;
}
