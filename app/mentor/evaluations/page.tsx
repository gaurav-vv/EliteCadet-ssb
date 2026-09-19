import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getEvaluations } from "@/lib/api/mentor";

export const metadata: Metadata = { title: "Evaluations" };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  reviewed: "Reviewed",
  none: "Not started",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function EvaluationsPage() {
  const result = await getEvaluations();
  const evaluations = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Evaluations</h1>
          <p className="text-sm text-text-muted">{evaluations.length} submitted so far.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/mentor/evaluations/new">New evaluation</Link>
        </Button>
      </div>

      {evaluations.length === 0 ? (
        <EmptyState title="No evaluations yet" description="Start one from a mentee's page or the button above." />
      ) : (
        <ul className="flex flex-col gap-2">
          {evaluations.map((evaluation) => (
            <li key={evaluation.id} className="glass-surface flex flex-col gap-1 px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {evaluation.menteeName} · {evaluation.activityOrSession}
                </span>
                <span className="text-sm font-semibold text-text-primary">{evaluation.score}</span>
              </div>
              <p className="text-xs text-text-muted">
                {STATUS_LABEL[evaluation.status]} · {formatDate(evaluation.createdAt)} · {evaluation.evaluatorName}
              </p>
              {evaluation.comments && <p className="text-sm text-text-muted">{evaluation.comments}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
