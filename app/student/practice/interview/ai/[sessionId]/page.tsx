import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { InterviewRoom } from "@/components/interview/interview-room";
import { getMyInterview } from "@/lib/server/ai/interview";

export const metadata: Metadata = { title: "AI interview" };

const MODE = { guided: "Guided interview", topic: "Topic interview", mock: "Mock interview" } as const;

export default async function AiInterviewSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const result = await getMyInterview(sessionId);
  if (!result.ok && result.error?.code === "not_found") notFound();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Link href="/student/practice/interview/ai" className="text-xs text-brand-accent hover:underline">
        ← AI interview
      </Link>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this interview. Please try again."} />
      ) : (
        <>
          <div>
            <h1 className="text-[28px] font-bold text-ink">{MODE[result.data.mode]}</h1>
            {result.data.topic && <p className="text-[14px] text-ink-secondary">Topic: {result.data.topic}</p>}
          </div>
          <InterviewRoom view={result.data} />
        </>
      )}
    </div>
  );
}
