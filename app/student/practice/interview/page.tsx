import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { Button } from "@/components/ui/button";
import { getModuleDetail } from "@/lib/practice/journey";
import { getBank, getMyAnswers } from "@/lib/server/practice/service";
import type { GuidedPracticeItem } from "@/types/ssb-journey";

export const metadata: Metadata = { title: "Interview" };

// Linked from Day 4 ("Personal Interview") via the module's href.
export default async function InterviewPracticePage() {
  const mod = getModuleDetail("day-4", "personal-interview");
  const [bank, answers] = await Promise.all([getBank("interview"), getMyAnswers("interview")]);
  if (!bank.ok || !bank.data || !answers.ok || !answers.data) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <Link href="/student/practice/day-4" className="text-xs text-brand-accent hover:underline">
          ← Day 4
        </Link>
        <RetryErrorState message={bank.error?.message ?? answers.error?.message ?? "We couldn't load the interview questions. Please try again."} />
      </div>
    );
  }

  return (
    <BankPracticeRunner
      slug="interview"
      backHref="/student/practice/day-4"
      backLabel="Day 4"
      context={mod?.context}
      responseItems={bank.data.items as GuidedPracticeItem[]}
      initialAnswers={answers.data}
      selfReview={mod?.selfReview}
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
