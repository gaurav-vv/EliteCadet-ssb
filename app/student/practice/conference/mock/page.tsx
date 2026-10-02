import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MockSession } from "@/components/practice/mock-session";
import { getSsbModuleDetail } from "@/lib/api/ssb-journey";

export const metadata: Metadata = { title: "Mock conference" };

// Linked from Day 5's "Mock Conference" card via its module `href`. The
// walkthrough text comes from that module; the questions from Day 5's
// Conference Questions bank.
export default async function MockConferencePage() {
  const [walkthrough, bank] = await Promise.all([
    getSsbModuleDetail("day-5", "mock-conference"),
    getSsbModuleDetail("day-5", "conference-questions"),
  ]);
  if (!walkthrough.ok || !walkthrough.data || !bank.ok || !bank.data) notFound();

  return (
    <MockSession
      kind="conference"
      title="Mock conference"
      intro={walkthrough.data.info?.overview ?? walkthrough.data.description}
      tips={walkthrough.data.info?.tips ?? []}
      questions={bank.data.responseItems ?? []}
      selfReview={bank.data.selfReview ?? []}
      backHref="/student/practice/day-5"
      backLabel="Day 5"
    />
  );
}
