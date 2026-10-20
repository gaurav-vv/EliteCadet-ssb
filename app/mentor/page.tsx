import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MentorDashboardView } from "@/components/dashboards/mentor-dashboard-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { getActor } from "@/lib/server/auth/guard";
import { getMentorDashboard } from "@/lib/server/dashboards/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function MentorDashboardPage() {
  const [result, actor] = await Promise.all([getMentorDashboard(new Date().toISOString()), getActor()]);
  // Independent mentors (no academy, specs.md §8a.1) see what's academy-only.
  const independent = actor?.profile.role === "mentor" && !actor.profile.academyId;
  const notice = independent ? (
    <Alert role="status">
      <AlertDescription>
        You&apos;re an independent mentor — not part of an academy. You can use the Library, create your own content, request content and manage your profile. Mentees, batches, sessions and live meetings, assessments and evaluations come from an academy&apos;s batches, so they stay empty until an academy adds you.
      </AlertDescription>
    </Alert>
  ) : null;
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        {notice}
        <RetryErrorState message={result.error?.message ?? "We couldn't load your dashboard. Please try again."} />
      </div>
    );
  }
  return (
    <>
      {notice && <div className="mb-6">{notice}</div>}
      <MentorDashboardView d={result.data} />
    </>
  );
}
