import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MockSession } from "@/components/practice/mock-session";
import { getModuleDetail } from "@/lib/practice/journey";
import { getBank, getMyLatestMock } from "@/lib/server/practice/service";
import type { GuidedPracticeItem } from "@/types/ssb-journey";

export const metadata: Metadata = { title: "Mock interview" };

export default async function MockInterviewPage() {
  const mod = getModuleDetail("day-4", "personal-interview");
  const [bank, last] = await Promise.all([getBank("interview"), getMyLatestMock("interview")]);
  if (!bank.ok || !bank.data || !last.ok) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <Link href="/student/practice/interview" className="text-xs text-brand-accent hover:underline">
          ← Interview
        </Link>
        <RetryErrorState message={bank.error?.message ?? last.error?.message ?? "We couldn't load the mock interview. Please try again."} />
      </div>
    );
  }

  return (
    <MockSession
      kind="interview"
      slug="interview"
      initialLast={last.data ?? null}
      title="Mock interview"
      intro="A timed run-through of a personal interview: one question at a time, as the Interviewing Officer would ask them, then a review of all your answers."
      tips={["If you can, say each answer out loud first, then type the key points."]}
      questions={bank.data.items as GuidedPracticeItem[]}
      selfReview={mod?.selfReview ?? []}
      backHref="/student/practice/interview"
      backLabel="Interview"
    />
  );
}
