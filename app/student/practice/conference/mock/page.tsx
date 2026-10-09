import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MockSession } from "@/components/practice/mock-session";
import { getModuleDetail } from "@/lib/practice/journey";
import { getBank, getMyLatestMock } from "@/lib/server/practice/service";
import type { GuidedPracticeItem } from "@/types/ssb-journey";

export const metadata: Metadata = { title: "Mock conference" };

// Linked from Day 5's "Mock Conference" card. The walkthrough text comes from
// that module; the questions from the conference bank.
export default async function MockConferencePage() {
  const walkthrough = getModuleDetail("day-5", "mock-conference");
  const questionsModule = getModuleDetail("day-5", "conference-questions");
  const [bank, last] = await Promise.all([getBank("conference"), getMyLatestMock("conference")]);
  if (!bank.ok || !bank.data || !last.ok) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <Link href="/student/practice/day-5" className="text-xs text-brand-accent hover:underline">
          ← Day 5
        </Link>
        <RetryErrorState message={bank.error?.message ?? last.error?.message ?? "We couldn't load the mock conference. Please try again."} />
      </div>
    );
  }

  return (
    <MockSession
      kind="conference"
      slug="conference"
      initialLast={last.data ?? null}
      title="Mock conference"
      intro={walkthrough?.info?.overview ?? walkthrough?.description ?? ""}
      tips={walkthrough?.info?.tips ?? []}
      questions={bank.data.items as GuidedPracticeItem[]}
      selfReview={questionsModule?.selfReview ?? []}
      backHref="/student/practice/day-5"
      backLabel="Day 5"
    />
  );
}
