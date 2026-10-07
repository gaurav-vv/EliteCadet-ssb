import type { Metadata } from "next";
import { AreaPlaceholder } from "@/components/admin/area-placeholder";

export const metadata: Metadata = { title: "Academy content" };

export default function AcademyContentAdminPage() {
  return <AreaPlaceholder area="academy_content" subtitle="Students, batches, mentors and settings." />;
}
