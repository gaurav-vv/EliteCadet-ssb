import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDashboardData } from "@/lib/api/academy";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard" };

const MENTOR_STATUS_LABEL: Record<string, string> = { invited: "Invited (pending)", active: "Active" };

export default async function AcademyDashboardPage() {
  const [result, { profile }] = await Promise.all([getDashboardData(), getCurrentUserAndProfile()]);
  if (!result.ok || !result.data) {
    return <ErrorState message="We couldn't load your academy dashboard. Please try again." />;
  }
  const data = result.data;
  const academyName = (await getCurrentAcademyName(profile?.academyId ?? null)) || data.academyName;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        title={academyName}
        subtitle="How your academy is performing today."
        primaryAction={
          <Button asChild size="sm" className="shadow-glow-accent">
            <Link href="/academy/students">Add student</Link>
          </Button>
        }
        secondaryActions={
          <>
            <Button asChild size="sm" variant="outline" className="glass-regular border-none">
              <Link href="/academy/batches">Create batch</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="glass-regular border-none">
              <Link href="/academy/mentors">Invite mentor</Link>
            </Button>
          </>
        }
      />

      {data.totalStudents === 0 && data.totalMentors === 0 ? (
        <Alert>
          <AlertDescription>
            Your academy is empty right now. Visit{" "}
            <Link href="/academy/settings" className="text-brand-accent underline">
              Settings
            </Link>{" "}
            to load sample demo data and preview what this dashboard looks like once populated.
          </AlertDescription>
        </Alert>
      ) : (
        data.alerts.length > 0 && (
          <section className="flex flex-col gap-2">
            {data.alerts.map((alert) => (
              <Alert key={alert.message}>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </section>
        )
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="students" label="Total students" value={data.totalStudents} />
        <StatCard icon="batches" label="Active batches" value={data.activeBatches} />
        <StatCard icon="mentees" label="Total mentors" value={data.totalMentors} />
        <StatCard icon="reports" label="Average readiness" value={data.averageReadiness ?? "—"} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Students needing attention</h2>
        {data.attentionStudents.length > 0 ? (
          <ListPanel>
            {data.attentionStudents.map((s) => (
              <ListRow key={s.studentId} href={`/academy/students/${s.studentId}`}>
                <span className="text-sm text-ink">{s.fullName}</span>
                <span className="text-xs text-ink-secondary">{s.reason}</span>
              </ListRow>
            ))}
          </ListPanel>
        ) : (
          <EmptyState title="No attention signals" description="Every student has recent, on-track activity." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Batch performance</h2>
        <ListPanel>
          {data.batchPerformance.map((batch) => (
            <ListRow key={batch.batchId} href={`/academy/batches/${batch.batchId}`}>
              <span className="text-sm text-ink">
                {batch.name} · {batch.studentCount} students
              </span>
              <span className="text-sm font-medium text-ink">{batch.averageReadiness ?? "—"}</span>
            </ListRow>
          ))}
        </ListPanel>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[18px] font-semibold text-ink">Mentor overview</h2>
        <ListPanel>
          {data.mentorOverview.map((mentor) => (
            <ListRow key={mentor.mentorId}>
              <span className="text-sm text-ink">{mentor.fullName}</span>
              <span className="text-xs text-ink-secondary">
                {MENTOR_STATUS_LABEL[mentor.status]} · {mentor.assignedStudentCount} students
              </span>
            </ListRow>
          ))}
        </ListPanel>
      </section>
    </div>
  );
}
