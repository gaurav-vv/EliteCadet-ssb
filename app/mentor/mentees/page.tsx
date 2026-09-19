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
        <h1 className="text-[28px] font-bold text-ink">Mentees</h1>
        <p className="text-sm text-ink-secondary">{mentees.length} students assigned to you.</p>
      </div>

      {mentees.length === 0 ? (
        <EmptyState title="No mentees yet" description="Students assigned to you will appear here." />
      ) : (
        <ul className="flex flex-col gap-2">
          {mentees.map((mentee) => (
            <li key={mentee.id}>
              <Link
                href={`/mentor/mentees/${mentee.id}`}
                className="glass-regular flex flex-col gap-2 px-5 py-4 no-underline hover:-translate-y-0.5 hover:scale-[1.01] sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{mentee.fullName}</p>
                  <p className="text-xs text-ink-secondary">
                    {mentee.batch} · {formatDate(mentee.lastActivityAt)}
                  </p>
                  {mentee.weakAreas.length > 0 && (
                    <p className="text-xs text-ink-secondary">Weak areas: {mentee.weakAreas.join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink">{mentee.overallScore ?? "—"}</span>
                  <span className="text-xs text-ink-secondary">{STATUS_LABEL[mentee.evaluationStatus]}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
