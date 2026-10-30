import type { Metadata } from "next";
import { DownloadsView } from "@/components/student/resources/views/downloads-view";

export const metadata: Metadata = { title: "Downloadable PDFs · Resources" };

export default async function DownloadsPage() {
  return DownloadsView({ audience: "student" });
}
