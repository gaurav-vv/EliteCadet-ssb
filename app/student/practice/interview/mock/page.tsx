import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MockSession } from "@/components/practice/mock-session";
import { getSsbModuleDetail } from "@/lib/api/ssb-journey";

export const metadata: Metadata = { title: "Mock interview" };

export default async function MockInterviewPage() {
  const result = await getSsbModuleDetail("day-4", "personal-interview");
  if (!result.ok || !result.data) notFound();

  return (
    <MockSession
      kind="interview"
      title="Mock interview"
      intro="A timed run-through of a personal interview: one question at a time, as the Interviewing Officer would ask them, then a review of all your answers."
      tips={["If you can, say each answer out loud first, then type the key points."]}
      questions={result.data.responseItems ?? []}
      selfReview={result.data.selfReview ?? []}
      backHref="/student/practice/interview"
      backLabel="Interview"
    />
  );
}
