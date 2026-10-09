import type { Metadata } from "next";
import { LibraryItem } from "@/components/content/library-view";

export const metadata: Metadata = { title: "Library" };

export default async function StudentLibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LibraryItem basePath="/student/library" id={id} />;
}
