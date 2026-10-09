import type { Metadata } from "next";
import { LibraryList } from "@/components/content/library-view";

export const metadata: Metadata = { title: "Library" };

export default async function AcademyLibraryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <LibraryList basePath="/academy/library" rawParams={await searchParams} subtitle="Material the platform has published for your academy." />;
}
