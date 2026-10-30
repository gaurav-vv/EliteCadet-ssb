import type { Metadata } from "next";
import { VideosView } from "@/components/student/resources/views/videos-view";

export const metadata: Metadata = { title: "SSB Preparation Videos · Resources" };

export default async function VideosPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  return VideosView({ audience: "student", searchParams });
}
