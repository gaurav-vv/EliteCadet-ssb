import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { getMentees } from "@/lib/api/mentor";

export const metadata: Metadata = { title: "Mentees" };

const STATUS_LABEL: Record<string, string> = {
  none: "Not evaluated",
  pending: "Evaluation pending",
  in_review: "In review",
  reviewed: "Reviewed",
};

function formatDate(iso: string | null) {
  if (!iso) return "No activity yet";
  return `Active ${new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

export default async function MenteesPage() {
  const result = await getMentees();
  const mentees = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Mentees</h1>
        <p className="text-sm text-text-muted">{mentees.length} students assigned to you.</p>
      </div>

      {mentees.length === 0 ? (
        <EmptyState title="No mentees yet" description="Students assigned to you will appear here." />
      ) : (
        <ul className="flex flex-col gap-2">
          {mentees.map((mentee) => (
            <li key={mentee.id}>
              <Link
                href={`/mentor/mentees/${mentee.id}`}
                className="glass-surface flex flex-col gap-2 px-5 py-4 no-underline hover:-translate-y-0.5 hover:scale-[1.01] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{mentee.fullName}</p>
                  <p className="text-xs text-text-muted">
                    {mentee.batch} · {formatDate(mentee.lastActivityAt)}
                  </p>
                  {mentee.weakAreas.length > 0 && (
                    <p className="text-xs text-text-muted">Weak areas: {mentee.weakAreas.join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-primary">{mentee.overallScore ?? "—"}</span>
                  <span className="text-xs text-text-muted">{STATUS_LABEL[mentee.evaluationStatus]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
