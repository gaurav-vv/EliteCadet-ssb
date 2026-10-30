import type { Metadata } from "next";
import { VideosView } from "@/components/student/resources/views/videos-view";

export const metadata: Metadata = { title: "SSB Preparation Videos · Resources" };

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default async function VideosPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  return VideosView({ audience: "academy", searchParams });
}
