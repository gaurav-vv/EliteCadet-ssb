import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { PracticeSession } from "@/components/practice/practice-session";
import { isPsychologyTest, PSYCHOLOGY_ACTIVITIES } from "@/lib/practice/activities";
import { getBank } from "@/lib/server/practice/service";

export async function generateMetadata({ params }: { params: Promise<{ test: string }> }): Promise<Metadata> {
  const { test } = await params;
  return { title: isPsychologyTest(test) ? test.toUpperCase() : "Practice" };
}

export default async function PsychologyTestPage({ params }: { params: Promise<{ test: string }> }) {
  const { test } = await params;
  const summary = PSYCHOLOGY_ACTIVITIES.find((a) => a.testType === test);
  if (!summary || !isPsychologyTest(test)) notFound();

  const bank = await getBank(test, { forTest: true });
  if (!bank.ok && bank.error?.code === "not_found") notFound();
  if (!bank.ok || !bank.data) {
    return (
      <div className="flex flex-col gap-4 pb-10">
        <Link href="/student/practice/psychology" className="text-xs text-brand-accent hover:underline">
          ← Psychology
        </Link>
        <RetryErrorState message={bank.error?.message ?? "We couldn't load this test. Please try again."} />
      </div>
    );
  }

  return <PracticeSession testType={test} summary={summary} items={bank.data.items} />;
}
