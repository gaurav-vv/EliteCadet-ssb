import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AiFeedbackView } from "@/components/practice/ai-feedback";
import { AttemptAnswers } from "@/components/practice/attempt-answers";
import { getMenteePsychologyAttempt } from "@/lib/server/ai/feedback";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Mentee practice" };

// Only for a student in one of this mentor's batches; anything else is "not found".
export default async function MenteePracticeAttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const result = await getMenteePsychologyAttempt(id, attemptId);
  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Link href={`/mentor/mentees/${id}`} className="text-xs text-brand-accent hover:underline">
        ← Mentee
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this attempt. Please try again."} />
      ) : (
        <>
          <div>
            <h1 className="text-[28px] font-bold text-ink">{result.data.title.split(" —")[0]} practice</h1>
            <p className="text-[14px] text-ink-secondary">Submitted {formatIstDay(result.data.submittedAt)}</p>
          </div>
          <AiFeedbackView state={result.data.feedback} audience="mentor" />
          <AttemptAnswers items={result.data.items} />
        </>
      )}
    </div>
  );
}
