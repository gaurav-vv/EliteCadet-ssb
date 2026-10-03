import type { Metadata } from "next";
import { PiqInterview } from "@/components/practice/piq-interview";
import { getSsbModuleDetail } from "@/lib/api/ssb-journey";

export const metadata: Metadata = { title: "My PIQ questions" };

export default async function PiqInterviewPage() {
  const result = await getSsbModuleDetail("day-4", "personal-interview");
  return <PiqInterview selfReview={result.data?.selfReview ?? []} />;
}
