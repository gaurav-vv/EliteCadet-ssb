import type { Metadata } from "next";
import Link from "next/link";
import { UserCog } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { StatusBadge } from "@/components/academy/shared/status-badge";
import { AddMentorPanel } from "@/components/academy/add-mentor-panel";
import { MentorInviteActions } from "@/components/academy/mentor-invite-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getAcademyMentors } from "@/lib/server/academy-people/service";

export const metadata: Metadata = { title: "Mentors" };

const SENT = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

// Status is dot + text (AGENTS.md §7.10), with what it means for logging in.
const ACCESS = {
  active: { label: "Active", tone: "success" },
  not_invited: { label: "Added — not invited (can't log in)", tone: "neutral" },
  invited: { label: "Invite pending", tone: "warning" },
  expired: { label: "Invite expired", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger" },
} as const;

// The academy's real mentors (profiles), with the batches each one is on.
export default async function MentorsPage() {
  const result = await getAcademyMentors();
  const mentors = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader title="Mentors" subtitle="Your academy's mentors and the batches they teach." />
      <AddMentorPanel />

      {!result.ok ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your mentors. Please try again."} />
      ) : mentors.length === 0 ? (
        <div className="glass-regular rounded-card">
          <EmptyState icon={<UserCog aria-hidden="true" size={22} />} title="No mentors yet" description="Invite or add your first mentor above, then assign them to a batch." />
        </div>
      ) : (
        <ListPanel>
          {mentors.map((m) => (
            <ListRow key={m.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{m.fullName || m.email || "Unnamed mentor"}</p>
                <p className="truncate text-[13px] text-ink-secondary">{m.email ?? "No email"}</p>
                {m.specialization.length > 0 && <p className="truncate text-[12px] text-ink-secondary">{m.specialization.join(" · ")}</p>}
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
              <div className="flex flex-col items-end gap-2">
                <StatusBadge label={ACCESS[m.access].label} tone={ACCESS[m.access].tone} />
                {m.inviteSentAt && (m.access === "invited" || m.access === "expired") && <p className="text-[12px] text-ink-secondary">Sent {SENT.format(new Date(m.inviteSentAt))} IST</p>}
                {(m.access === "not_invited" || m.access === "invited" || m.access === "expired") && <MentorInviteActions mentorId={m.id} name={m.fullName || m.email || "this mentor"} access={m.access} />}
              </div>
            </ListRow>
          ))}
        </ListPanel>
      )}
    </div>
  );
}
