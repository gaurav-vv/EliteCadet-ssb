import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AiFeedbackView } from "@/components/practice/ai-feedback";
import { PendingRefresh } from "@/components/practice/pending-refresh";
import { Button } from "@/components/ui/button";
import { getMyDiagnostic } from "@/lib/server/diagnostic/service";
import { formatIstDay } from "@/lib/server/sessions/validation";

export const metadata: Metadata = { title: "Diagnostic result" };

export default async function DiagnosticResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyDiagnostic(id);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) return <RetryErrorState message={result.error?.message ?? "We couldn't load this diagnostic. Please try again."} />;
  const d = result.data;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <Link href="/student/diagnostic" className="text-xs text-brand-accent hover:underline">
        ← Diagnostic
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-ink">{d.kind === "baseline" ? "Your starting point" : "Re-assessment"}</h1>
          <p className="text-[14px] text-ink-secondary">Taken {formatIstDay(d.submittedAt)}</p>
        </div>
        <Button asChild className="min-h-11">
          <Link href="/student/roadmap">See your roadmap</Link>
        </Button>
      </div>
      <section className="grid gap-3 sm:grid-cols-2">
        {([["SSB knowledge", d.knowledge], ["Reasoning", d.reasoning]] as const).map(([label, s]) => (
          <div key={label} className="glass-regular flex flex-col gap-1 rounded-card px-5 py-4">
            <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
            <span className="text-[28px] font-bold text-ink">
              {s.correct} of {s.total}
            </span>
          </div>
        ))}
      </section>
      <PendingRefresh active={d.feedback.status === "pending"} />
      <AiFeedbackView state={d.feedback} />
      <details className="glass-regular rounded-card px-6 py-4">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-ink">Your answers</summary>
        <ol className="mt-3 flex flex-col gap-3 text-sm">
          {d.multipleChoice.map((m, i) => (
            <li key={`m${i}`} className="flex flex-col">
              <span className="text-ink-secondary">{m.prompt}</span>
              <span className="text-ink">{!m.answered ? "Skipped" : m.correct ? "Correct" : "Not correct"}</span>
            </li>
          ))}
          {d.written.map((w, i) => (
            <li key={`w${i}`} className="flex flex-col">
              <span className="text-ink-secondary">{w.prompt}</span>
              <span className="whitespace-pre-wrap text-ink">{w.response.trim() || "Skipped"}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
