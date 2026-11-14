import type { Metadata } from "next";
import { DownloadsView } from "@/components/student/resources/views/downloads-view";

export const metadata: Metadata = { title: "Downloadable PDFs · Resources" };

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default async function DownloadsPage() {
  return DownloadsView({ audience: "academy" });
}
