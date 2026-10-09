import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AcademyFormDialog } from "@/components/admin/academies/academy-form-dialog";
import { AcademyStatusTag } from "@/components/admin/academies/academy-status-tag";
import { AddMemberForm } from "@/components/admin/academies/add-member-form";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { RoleTag, UserStatusTag } from "@/components/admin/users/user-tags";
import { DetailHeader } from "@/components/ui/detail-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { changeAcademyStatusAction, removeAcademyMemberAction } from "@/lib/actions/academies";
import { getAcademyDetail } from "@/lib/server/academies/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Academy" };

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass-regular flex flex-col gap-1.5 rounded-card px-5 py-4">
      <span className="text-[11px] font-bold tracking-[0.04em] text-ink-secondary uppercase">{label}</span>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

const none = (t: string) => <span className="text-ink-secondary">{t}</span>;

export default async function AcademyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getAcademyDetail(id);
  if (!result.ok && result.error?.code === "not_found") notFound();

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/admin/academies" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        All academies
      </Link>

      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load this academy. Please try again."} />
      ) : (
        (() => {
          const { academy, counts, members, history } = result.data;
          const suspending = academy.status === "active";
          return (
            <>
              <h1 className="sr-only">{academy.name}</h1>
              <DetailHeader
                name={academy.name}
                subtitle={academy.description ?? "No description yet"}
                statusTag={<AcademyStatusTag status={academy.status} />}
                action={
                  <div className="flex flex-wrap gap-3">
                    <AcademyFormDialog academy={academy} />
                    <ConfirmActionDialog
                      triggerLabel={suspending ? "Suspend academy" : "Reactivate academy"}
                      title={suspending ? "Suspend this academy?" : "Reactivate this academy?"}
                      description={
                        suspending
                          ? `Everyone in ${academy.name} (admins, mentors and students) will be signed out and can't log in until it's reactivated. Their data is kept.`
                          : `Members of ${academy.name} will be able to log in again.`
                      }
                      confirmLabel={suspending ? "Suspend academy" : "Reactivate academy"}
                      destructive={suspending}
                      action={changeAcademyStatusAction.bind(null, academy.id, suspending ? "suspended" : "active")}
                    />
                  </div>
                }
              />

              <section aria-label="Academy details" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Contact email">{academy.contactEmail ?? none("Not provided")}</InfoCard>
                <InfoCard label="Contact phone">{academy.contactPhone ?? none("Not provided")}</InfoCard>
                <InfoCard label="Created">{formatDay(academy.createdAt)}</InfoCard>
                <InfoCard label="Academy admins">{counts.admins}</InfoCard>
                <InfoCard label="Mentors">{counts.mentors}</InfoCard>
                <InfoCard label="Students">{counts.students}</InfoCard>
              </section>

              <section aria-labelledby="members-heading" className="flex flex-col gap-3">
                <h2 id="members-heading" className="text-[18px] font-bold text-ink">
                  Members
                </h2>
                <div className="glass-regular rounded-card px-5 py-5">
                  <AddMemberForm academyId={academy.id} />
                </div>
                {members.length === 0 ? (
                  <div className="glass-regular rounded-card">
                    <EmptyState icon={<Users aria-hidden="true" size={22} />} title="No members yet" description="Add an academy admin first, then mentors and students." />
                  </div>
                ) : (
                  <ListPanel>
                    {members.map((m) => (
                      <ListRow key={m.id}>
                        <Link href={`/admin/users/${m.id}`} className="min-w-0 no-underline">
                          <p className="truncate text-sm text-ink">{m.fullName || m.email || "Unnamed account"}</p>
                          <p className="truncate text-[13px] text-ink-secondary">{m.email ?? "No email"}</p>
                        </Link>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                          <RoleTag role={m.role} />
                          <UserStatusTag status={m.status} />
                          {m.role === "student" && (
                            <ConfirmActionDialog
                              triggerLabel="Remove"
                              triggerAriaLabel={`Remove ${m.fullName || m.email} from ${academy.name}`}
                              title="Remove from academy?"
                              description={`${m.fullName || m.email} will no longer belong to ${academy.name}. Their account and history are kept.`}
                              confirmLabel="Remove"
                              destructive
                              action={removeAcademyMemberAction.bind(null, academy.id, m.id)}
                            />
                          )}
                        </div>
                      </ListRow>
                    ))}
                  </ListPanel>
                )}
                <p className="text-[12px] text-ink-secondary">To remove a mentor or academy admin, change their role on their user page first.</p>
              </section>

              <section aria-labelledby="history-heading" className="flex flex-col gap-3">
                <h2 id="history-heading" className="text-[18px] font-bold text-ink">
                  Academy history
                </h2>
                {history.length === 0 ? (
                  <div className="glass-regular rounded-card">
                    <EmptyState title="No changes yet" description="Edits, status changes and membership changes appear here." />
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
