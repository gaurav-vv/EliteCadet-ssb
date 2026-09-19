import type { Metadata } from "next";
import Link from "next/link";
import { CapsuleSmall } from "@/components/ui/capsule";
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
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">{academyName}</h1>
        <p className="text-sm text-text-muted">How your academy is performing today.</p>
      </div>

      <section className="flex flex-wrap gap-2">
        <CapsuleSmall href="/academy/students" icon="students" label="Add student" />
        <CapsuleSmall href="/academy/batches" icon="batches" label="Create batch" />
        <CapsuleSmall href="/academy/mentors" icon="mentees" label="Invite mentor" />
      </section>

      {data.totalStudents === 0 && data.totalMentors === 0 ? (
        <Alert>
          <AlertDescription>
            Your academy is empty right now. Visit{" "}
            <Link href="/academy/settings" className="underline">
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
        {[
          { label: "Total students", value: data.totalStudents },
          { label: "Active batches", value: data.activeBatches },
          { label: "Total mentors", value: data.totalMentors },
          { label: "Average readiness", value: data.averageReadiness ?? "—" },
        ].map((stat) => (
          <div key={stat.label} className="glass-surface flex flex-col gap-1 px-5 py-4">
            <span className="text-xs font-medium tracking-wide text-text-muted uppercase">{stat.label}</span>
            <span className="text-2xl font-semibold text-text-primary">{stat.value}</span>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Students needing attention</h2>
        {data.attentionStudents.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.attentionStudents.map((s) => (
              <li key={s.studentId}>
                <Link
                  href={`/academy/students/${s.studentId}`}
                  className="glass-surface flex items-center justify-between px-5 py-3 no-underline"
                >
                  <span className="text-sm text-text-primary">{s.fullName}</span>
                  <span className="text-xs text-text-muted">{s.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No attention signals" description="Every student has recent, on-track activity." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Batch performance</h2>
        <div className="flex flex-col gap-2">
          {data.batchPerformance.map((batch) => (
            <Link
              key={batch.batchId}
              href={`/academy/batches/${batch.batchId}`}
              className="glass-surface flex items-center justify-between px-5 py-3 no-underline"
            >
              <span className="text-sm text-text-primary">
                {batch.name} · {batch.studentCount} students
              </span>
              <span className="text-sm font-medium text-text-primary">{batch.averageReadiness ?? "—"}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Mentor overview</h2>
        <div className="flex flex-col gap-2">
          {data.mentorOverview.map((mentor) => (
            <div key={mentor.mentorId} className="glass-surface flex items-center justify-between px-5 py-3">
              <span className="text-sm text-text-primary">{mentor.fullName}</span>
              <span className="text-xs text-text-muted">
                {MENTOR_STATUS_LABEL[mentor.status]} · {mentor.assignedStudentCount} students
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
