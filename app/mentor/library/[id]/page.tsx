import type { Metadata } from "next";
import { LibraryItem } from "@/components/content/library-view";

export const metadata: Metadata = { title: "Library" };

export default async function MentorLibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryItem basePath="/mentor/library" id={id} />;
}
