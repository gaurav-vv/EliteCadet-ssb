import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CapsuleSecondary } from "@/components/ui/capsule";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMentee } from "@/lib/api/mentor";

// No real auth yet (status.md, 2026-09-18): this only checks the mentee
// exists in the mock dataset, not that this mentor is actually assigned to
// them. Real ownership enforcement is server-side work for T013/T014/T060.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const result = await getMentee(id);
  return { title: result.data?.fullName ?? "Mentee" };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function MenteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getMentee(id);

  if (!result.ok || !result.data) {
    notFound();
  }

  const mentee = result.data;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <Link href="/mentor/mentees" className="text-xs text-brand-navy hover:underline">
          ← Mentees
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">{mentee.fullName}</h1>
            <p className="text-sm text-text-muted">
              {mentee.batch} · {mentee.targetExam} · {mentee.academyName ?? "No academy"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href={`/mentor/evaluations/new?menteeId=${mentee.id}`}>Evaluate</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="glass-surface flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium tracking-wide text-text-muted uppercase">Overall score</span>
          <span className="text-2xl font-semibold text-text-primary">{mentee.overallScore ?? "—"}</span>
        </div>
        <div className="glass-surface flex flex-col gap-1 px-5 py-4">
          <span className="text-xs font-medium tracking-wide text-text-muted uppercase">Weak areas</span>
          <span className="text-sm text-text-primary">
            {mentee.weakAreas.length > 0 ? mentee.weakAreas.join(", ") : "None identified yet"}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Activity</h2>
        {mentee.activity.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {mentee.activity.map((item) => (
              <li key={item.id}>
                <CapsuleSecondary icon="psychology" label={item.title} description={`${item.category} · ${formatDate(item.completedAt)}`} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No activity yet" description="This student hasn't submitted a practice yet." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">AI feedback</h2>
        <EmptyState
          title="AI feedback isn't available yet"
          description="AI-assisted feedback is tracked as T034 and hasn't been built."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Mentor feedback</h2>
        {mentee.mentorFeedback.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {mentee.mentorFeedback.map((note) => (
              <li key={note.id} className="glass-surface flex flex-col gap-1 px-5 py-3">
                <p className="text-sm text-text-primary">{note.comment}</p>
                <p className="text-xs text-text-muted">{formatDate(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No feedback yet" description="Feedback you leave in an evaluation will appear here." />
        )}
      </section>
    </div>
  );
}
