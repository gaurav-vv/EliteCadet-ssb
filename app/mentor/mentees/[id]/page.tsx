import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DetailHeader } from "@/components/ui/detail-header";
import { StatCard } from "@/components/ui/stat-card";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
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
      <Link href="/mentor/mentees" className="text-xs text-brand-accent hover:underline">
        ← Mentees
      </Link>

      <DetailHeader
        name={mentee.fullName}
        subtitle={`${mentee.batch} · ${mentee.targetExam} · ${mentee.academyName ?? "No academy"}`}
        action={
          <Button asChild size="sm" className="shadow-glow-accent">
            <Link href={`/mentor/evaluations/new?menteeId=${mentee.id}`}>Evaluate</Link>
          </Button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Overall score" value={mentee.overallScore ?? "—"} />
        <div className="glass-regular flex flex-col gap-1 rounded-card px-5 py-4">
          <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">Weak areas</span>
          <span className="text-[14px] text-ink">
            {mentee.weakAreas.length > 0 ? mentee.weakAreas.join(", ") : "None identified yet"}
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Activity</h2>
        {mentee.activity.length > 0 ? (
          <ListPanel>
            {mentee.activity.map((item) => (
              <ListRow key={item.id}>
                <span className="text-sm text-ink">{item.title}</span>
                <span className="text-xs text-ink-secondary">
                  {item.category} · {formatDate(item.completedAt)}
                </span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No activity yet" description="This student hasn't submitted a practice yet." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">AI feedback</h2>
        <EmptyState
          title="AI feedback isn't available yet"
          description="AI-assisted feedback is tracked as T034 and hasn't been built."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Mentor feedback</h2>
        {mentee.mentorFeedback.length > 0 ? (
          <ListPanel>
            {mentee.mentorFeedback.map((note) => (
              <div key={note.id} className="flex flex-col gap-1 px-5 py-3">
                <p className="text-sm text-ink">{note.comment}</p>
                <p className="text-xs text-ink-secondary">{formatDate(note.createdAt)}</p>
              </div>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No feedback yet" description="Feedback you leave in an evaluation will appear here." />
        )}
      </section>
    </div>
  );
}
