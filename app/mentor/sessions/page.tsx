import type { Metadata } from "next";
import { SessionsView } from "@/components/mentor/sessions-view";
import { getSessions, getMenteeOptions } from "@/lib/api/mentor";

export const metadata: Metadata = { title: "Sessions" };

export default async function SessionsPage() {
  const [sessionsResult, menteesResult] = await Promise.all([getSessions(), getMenteeOptions()]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Sessions</h1>
        <p className="text-sm text-ink-secondary">Basic scheduling — no recurrence or calendar sync yet.</p>
      </div>
      <SessionsView sessions={sessionsResult.data ?? []} mentees={menteesResult.data ?? []} />
    </div>
  );
}
