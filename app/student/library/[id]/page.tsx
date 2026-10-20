import type { Metadata } from "next";
import { LibraryItem } from "@/components/content/library-view";
import { MarkDoneButton } from "@/components/progress/mark-done-button";
import { isContentDone } from "@/lib/server/progress/service";

export const metadata: Metadata = { title: "Library" };

export default async function StudentLibraryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const done = await isContentDone(id);
  return <LibraryItem basePath="/student/library" id={id} footer={<MarkDoneButton contentId={id} initialDone={done} />} />;
}
