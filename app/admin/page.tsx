import type { Metadata } from "next";
import Link from "next/link";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { RoleTag } from "@/components/admin/users/user-tags";
import { Button } from "@/components/ui/button";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getPlatformOverview } from "@/lib/server/users/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const result = await getPlatformOverview();

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader
        title="Dashboard"
        subtitle="Super Admin: every account and academy on the platform."
        primaryAction={
          <Button asChild className="min-h-11">
            <Link href="/admin/users">Manage users</Link>
          </Button>
        }
      />

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load the dashboard. Please try again."} />
      ) : (
        <>
          <section aria-label="Platform totals" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard icon="users" label="Total users" value={result.data.summary.total} />
            <StatCard icon="students" label="Students" value={result.data.summary.students} />
            <StatCard icon="mentors" label="Mentors" value={result.data.summary.mentors} />
            <StatCard icon="academy" label="Academy admins" value={result.data.summary.academyAdmins} />
            <StatCard icon="batches" label="Academies" value={result.data.summary.academies} />
            <StatCard icon="attention" label="Suspended accounts" value={result.data.summary.suspended} />
          </section>

          <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 id="recent-heading" className="text-[18px] font-bold text-ink">
                Newest accounts
              </h2>
              <Link href="/admin/users" className="text-[13px] text-brand-accent">
                View all
              </Link>
            </div>
            <ListPanel>
              {result.data.recent.map((user) => (
                <ListRow key={user.id} href={`/admin/users/${user.id}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{user.fullName || user.email || "Unnamed account"}</p>
                    <p className="truncate text-[13px] text-ink-secondary">
                      {user.email ?? "No email"} · joined {formatDay(user.createdAt)}
                    </p>
                  </div>
                  <RoleTag role={user.role} />
                </ListRow>
              ))}
            </ListPanel>
          </section>
        </>
      )}
    </div>
  );
}
