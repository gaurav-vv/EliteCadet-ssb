import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AiFeedbackView } from "@/components/practice/ai-feedback";
import { AttemptAnswers } from "@/components/practice/attempt-answers";
import { PendingRefresh } from "@/components/practice/pending-refresh";
import { Button } from "@/components/ui/button";
import { getMyPsychologyAttempt } from "@/lib/server/ai/feedback";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Practice feedback" };

export default async function PsychologyResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await getMyPsychologyAttempt(attemptId);
  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Link href="/student/practice/psychology" className="text-xs text-brand-accent hover:underline">
        ← Psychology
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this attempt. Please try again."} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-bold text-ink">{result.data.title.split(" —")[0]} practice</h1>
              <p className="text-[14px] text-ink-secondary">Submitted {formatIstDay(result.data.submittedAt)}</p>
            </div>
            <Button asChild className="min-h-11">
              <Link href={`/student/practice/psychology/${result.data.test}`}>Practise again</Link>
            </Button>
          </div>
          <PendingRefresh active={result.data.feedback.status === "pending"} />
          <AiFeedbackView state={result.data.feedback} />
          <AttemptAnswers items={result.data.items} />
        </>
      )}
    </div>
  );
}
