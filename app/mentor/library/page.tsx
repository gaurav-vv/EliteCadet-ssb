import type { Metadata } from "next";
import { LibraryList } from "@/components/content/library-view";

export const metadata: Metadata = { title: "Library" };

export default async function MentorLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryList basePath="/mentor/library" rawParams={await searchParams} subtitle="Material published for mentors — by the platform, your academy or your batches." />;
}
