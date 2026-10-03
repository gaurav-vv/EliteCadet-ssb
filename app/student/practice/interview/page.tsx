import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { getSsbModuleDetail } from "@/lib/api/ssb-journey";

export const metadata: Metadata = { title: "Interview" };

// Linked from Day 4 ("Personal Interview") of the 5-Day SSB Practice Journey
// (T039) via SsbModuleSummary.href, rather than duplicating this route under
// /student/practice/day-4/personal-interview.
export default async function InterviewPracticePage() {
  const result = await getSsbModuleDetail("day-4", "personal-interview");
  if (!result.ok || !result.data) notFound();
  const mod = result.data;

  return (
    <BankPracticeRunner
      dayId="day-4"
      moduleId="personal-interview"
      backHref="/student/practice/day-4"
      backLabel="Day 4"
      context={mod.context}
      responseItems={mod.responseItems}
      selfReview={mod.selfReview}
      actions={
        <>
          <Button asChild size="sm">
            <Link href="/student/practice/interview/mock">Start mock interview</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/student/practice/interview/piq">My PIQ questions</Link>
          </Button>
        </>
      }
    />
  );
}
