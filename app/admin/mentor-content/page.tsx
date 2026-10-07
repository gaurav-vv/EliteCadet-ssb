import type { Metadata } from "next";
import { AreaPlaceholder } from "@/components/admin/area-placeholder";

export const metadata: Metadata = { title: "Mentor content" };

export default function MentorContentAdminPage() {
  return <AreaPlaceholder area="mentor_content" subtitle="Evaluation rubrics, session templates and guidance." />;
}
