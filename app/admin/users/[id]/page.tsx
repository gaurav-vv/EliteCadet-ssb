import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { UserAccountActions } from "@/components/admin/users/user-account-actions";
import { RoleTag, UserStatusTag } from "@/components/admin/users/user-tags";
import { DetailHeader } from "@/components/ui/detail-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getUserDetail } from "@/lib/server/users/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "User" };

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-bold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getUserDetail(id);

  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/admin/users" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        All users
      </Link>

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this user. Please try again."} />
      ) : (
        (() => {
          const { user, history, isSelf } = result.data;
          const name = user.fullName || user.email || "Unnamed account";
          return (
            <>
              <h1 className="sr-only">{name}</h1>
              <DetailHeader
                name={name}
                subtitle={user.email ?? "No email on file"}
                statusTag={
                  <span className="flex flex-wrap items-center gap-3">
                    <RoleTag role={user.role} />
                    <UserStatusTag status={user.status} />
                  </span>
                }
              />

              <section aria-label="Account details" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Academy">{user.academyName ?? <span className="text-ink-secondary">Not part of an academy</span>}</InfoCard>
                <InfoCard label="Phone">{user.phone ?? <span className="text-ink-secondary">Not provided</span>}</InfoCard>
                <InfoCard label="Last login">{formatDay(user.lastLoginAt) ?? <span className="text-ink-secondary">Never</span>}</InfoCard>
                <InfoCard label="Joined">{formatDay(user.createdAt)}</InfoCard>
                <InfoCard label="Sign-in method">Email and password</InfoCard>
              </section>

              <section aria-labelledby="manage-heading" className="glass-regular flex flex-col gap-4 rounded-card px-6 py-5">
                <h2 id="manage-heading" className="text-[18px] font-bold text-ink">
                  Manage account
                </h2>
                {isSelf ? (
                  <p className="text-sm text-ink-secondary">
                    This is your own account. Another super admin has to change your role or status, so the platform can never be left without one.
                  </p>
                ) : (
                  <UserAccountActions userId={user.id} name={name} role={user.role} status={user.status} />
                )}
              </section>

              <section aria-labelledby="history-heading" className="flex flex-col gap-3">
                <h2 id="history-heading" className="text-[18px] font-bold text-ink">
                  Account history
                </h2>
                {history.length === 0 ? (
                  <div className="glass-regular rounded-card">
                    <EmptyState title="No admin changes yet" description="Role and status changes made by super admins appear here." />
                  </div>
                ) : (
                  <ol className="glass-regular flex flex-col gap-4 rounded-card px-6 py-5">
                    {history.map((entry) => (
                      <li key={entry.id} className="relative border-l border-hairline pl-4">
                        <span aria-hidden="true" className="absolute top-1.5 -left-[4px] size-2 rounded-full bg-ink-secondary" />
                        <p className="text-sm text-ink">{typeof entry.details.summary === "string" ? entry.details.summary : entry.action}</p>
                        <p className="text-[12px] text-ink-secondary">
                          {formatDay(entry.createdAt)} · by {entry.actorName || "a super admin"}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          );
        })()
      )}
    </div>
  );
}
