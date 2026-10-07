import type { Metadata } from "next";
import { AreaPlaceholder } from "@/components/admin/area-placeholder";

export const metadata: Metadata = { title: "Student content" };

export default function StudentContentAdminPage() {
  return <AreaPlaceholder area="student_content" subtitle="Practice banks, journey modules and resources." />;
}
