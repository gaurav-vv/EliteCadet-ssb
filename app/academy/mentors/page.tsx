import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { InviteMentorForm } from "@/components/academy/invite-mentor-form";
import { getMentors } from "@/lib/api/academy";

export const metadata: Metadata = { title: "Mentors" };

export default async function MentorsPage() {
  const result = await getMentors();
  const mentors = result.data ?? [];

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Mentors</h1>
        <p className="text-sm text-text-muted">{mentors.length} mentors in your academy.</p>
      </div>

      <InviteMentorForm />

      {mentors.length === 0 ? (
        <EmptyState title="No mentors yet" description="Invite your first mentor above." />
      ) : (
        <ul className="flex flex-col gap-2">
          {mentors.map((mentor) => (
            <li key={mentor.id} className="glass-surface flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium text-text-primary">{mentor.fullName}</p>
                <p className="text-xs text-text-muted">{mentor.email}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                {mentor.status === "invited" ? (
                  <span className="text-warning font-medium">Invited — not yet accepted</span>
                ) : (
                  <>
                    <span>{mentor.sessionsThisWeek} sessions this week</span>
                    <span>{mentor.pendingEvaluations} pending evaluations</span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
