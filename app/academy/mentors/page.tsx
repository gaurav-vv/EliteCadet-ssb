import type { Metadata } from "next";
import Link from "next/link";
import { UserCog } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { InviteMentorForm } from "@/components/academy/invite-mentor-form";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyMentors } from "@/lib/server/academy-people/service";

export const metadata: Metadata = { title: "Mentors" };

// The academy's real mentors (profiles), with the batches each one is on.
export default async function MentorsPage() {
  const result = await getAcademyMentors();
  const mentors = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Mentors" subtitle="Your academy's mentors and the batches they teach." />
      <InviteMentorForm />

      {!result.ok ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your mentors. Please try again."} />
      ) : mentors.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<UserCog aria-hidden="true" size={22} />} title="No mentors yet" description="Invite your first mentor above, then assign them to a batch." />
        </div>
      ) : (
        <ListPanel>
          {mentors.map((m) => (
            <ListRow key={m.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{m.fullName || m.email || "Unnamed mentor"}</p>
                <p className="truncate text-[13px] text-ink-secondary">{m.email ?? "No email"}</p>
                <p className="text-[12px] text-ink-secondary">
                  {m.batches.length > 0
                    ? m.batches.map((b, i) => (
                        <span key={b.id}>
                          {i > 0 && ", "}
                          <Link href={`/academy/batches/${b.id}`} className="text-ink-secondary">{b.name}</Link>
                        </span>
                      ))
                    : "Not on a batch yet"}
                </p>
              </div>
              <StatusBadge
                label={m.status === "suspended" ? "Suspended" : m.invited ? "Invited — not signed in yet" : "Active"}
                tone={m.status === "suspended" ? "danger" : m.invited ? "warning" : "success"}
              />
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
