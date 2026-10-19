import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { Transcript } from "@/components/interview/interview-room";
import { AiFeedbackView } from "@/components/practice/ai-feedback";
import { getMenteeInterview } from "@/lib/server/ai/interview";

export const metadata: Metadata = { title: "Mentee interview" };

const MODE = { guided: "Guided interview", topic: "Topic interview", mock: "Mock interview" } as const;

// Only for a student in one of this mentor's batches; anything else is "not found".
export default async function MenteeInterviewPage({ params }: { params: Promise<{ id: string; sessionId: string }> }) {
  const { id, sessionId } = await params;
  const result = await getMenteeInterview(id, sessionId);
  if (!result.ok && result.error?.code === "not_found") notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Link href={`/mentor/mentees/${id}`} className="text-xs text-brand-accent hover:underline">
        ← Mentee
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this interview. Please try again."} />
      ) : (
        <>
          <div>
            <h1 className="text-[28px] font-bold text-ink">{MODE[result.data.mode]}</h1>
            <p className="text-[14px] text-ink-secondary">{result.data.status === "active" ? "In progress" : "Completed"}{result.data.topic ? ` · ${result.data.topic}` : ""}</p>
          </div>
          {result.data.status === "completed" && <AiFeedbackView state={result.data.feedback} audience="mentor" />}
          <Transcript turns={result.data.turns} showReasons />
        </>
      )}
    </div>
  );
}
