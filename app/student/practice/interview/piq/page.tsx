import type { Metadata } from "next";
import { PiqInterview } from "@/components/practice/piq-interview";
import { getModuleDetail } from "@/lib/practice/journey";

export const metadata: Metadata = { title: "My PIQ questions" };

export default function PiqInterviewPage() {
  return <PiqInterview selfReview={getModuleDetail("day-4", "personal-interview")?.selfReview ?? []} />;
}
