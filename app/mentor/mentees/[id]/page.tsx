import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { DetailHeader } from "@/components/ui/detail-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyMentee } from "@/lib/server/academy-people/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Mentee" };

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

// Only a student in one of this mentor's batches. Any other id — another
// batch, another academy, or nonexistent — is the same "not found" (specs §7.4).
export default async function MenteeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyMentee(id);
  if (!result.ok && result.error?.code === "not_found") notFound();

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/mentor/mentees" className="text-[13px] text-ink-secondary no-underline">‹ Mentees</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this student. Please try again."} />
      </div>
    );
  }

  const { student, mentors } = result.data;
  const name = student.fullName || student.email || "Unnamed student";

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/mentees" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Mentees
      </Link>
      <h1 className="sr-only">{name}</h1>
      <DetailHeader name={name} subtitle={student.email ?? "No email on file"} />

      <section aria-label="Mentee details" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard label="Batch">{student.batchName ?? "—"}</InfoCard>
        <InfoCard label="Mentors on this batch">{mentors.map((m) => m.name).join(", ") || "—"}</InfoCard>
        <InfoCard label="Last login">{formatDay(student.lastLoginAt) ?? <span className="text-ink-secondary">Never</span>}</InfoCard>
      </section>

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <h2 id="activity-heading" className="text-[18px] font-semibold text-ink">Activity and evaluations</h2>
        <div className="glass-regular rounded-card">
          <EmptyState title="Nothing to show yet" description="Practice activity, assessments and evaluations for this student arrive in later phases." />
        </div>
      </section>
    </div>
  );
}
