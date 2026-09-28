import type { Metadata } from "next";
import { BankPracticeRunner } from "@/components/practice/bank-practice-runner";
import { INTERVIEW_QUESTIONS } from "@/lib/mock/ssb-journey";

export const metadata: Metadata = { title: "Interview" };

// Linked from Day 4 ("Personal Interview") of the 5-Day SSB Practice Journey
// (T039) via SsbModuleSummary.href, rather than duplicating this route under
// /student/practice/day-4/personal-interview.
export default function InterviewPracticePage() {
  return (
    <BankPracticeRunner
      dayId="day-4"
      moduleId="personal-interview"
      backHref="/student/practice/day-4"
      backLabel="Day 4"
      responseItems={INTERVIEW_QUESTIONS}
    />
  );
}
