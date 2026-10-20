import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { InterviewStart } from "@/components/interview/interview-start";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { getMyInterviews, listTopics } from "@/lib/server/ai/interview";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "AI interview" };

const MODE = { guided: "Guided", topic: "Topic", mock: "Mock interview" } as const;

export default async function AiInterviewPage() {
  const [topics, interviews] = await Promise.all([listTopics(), getMyInterviews(10)]);
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/student/practice/interview" className="text-xs text-brand-accent hover:underline">
          ← Interview
        </Link>
        <h1 className="mt-1 text-[28px] font-bold text-ink">AI interview</h1>
        <p className="max-w-2xl text-[14px] text-ink-secondary">
          An AI interviewer asks one question at a time and follows up on what you actually say. Feedback comes at the end. It is practice — not an SSB assessment.
        </p>
      </div>
      {!topics.ok || !topics.data ? <RetryErrorState message={topics.error?.message ?? "We couldn't load interview options. Please try again."} /> : <InterviewStart topics={topics.data} />}
      {interviews.ok && interviews.data && interviews.data.length > 0 && (
        <section aria-labelledby="past-interviews" className="flex flex-col gap-3">
          <h2 id="past-interviews" className="text-[18px] font-semibold text-ink">Your interviews</h2>
          <ListPanel>
            {interviews.data.map((i) => (
              <ListRow key={i.id} href={`/student/practice/interview/ai/${i.id}`}>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink">
                    {MODE[i.mode]}
                    {i.topic ? ` · ${i.topic}` : ""}
                  </span>
                  <span className="text-xs text-ink-secondary">
                    {formatIstDay(i.createdAt)} · {i.answered} of {i.maxQuestions} answered
                  </span>
                </span>
                {i.status === "active" && <StatusBadge label="In progress" tone="info" />}
                {i.feedback === "ready" && <StatusBadge label="Feedback ready" tone="success" />}
                {i.feedback === "pending" && <StatusBadge label="Feedback coming" tone="info" />}
                {i.feedback === "unavailable" && <StatusBadge label="No AI feedback" tone="neutral" />}
              </ListRow>
            ))}
          </ListPanel>
        </section>
      )}
    </div>
  );
}
