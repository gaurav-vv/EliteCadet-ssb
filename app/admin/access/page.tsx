import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { GrantAccessForm } from "@/components/admin/grant-access-form";
import { RevokeAccessButton } from "@/components/admin/revoke-access-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { PageHeader } from "@/components/ui/page-header";
import { ADMIN_AREA_LABELS } from "@/lib/admin/access";
import { listAdminGrants } from "@/lib/api/admin-access";
import { requireAdminArea } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Access" };

export default async function AdminAccessPage() {
  const { userId } = await requireAdminArea("super");
  const result = await listAdminGrants();

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title="Access" subtitle="Choose who can add and edit content in each area." />

      <GrantAccessForm />

      <section aria-labelledby="grants-heading" className="flex flex-col gap-3">
        {/* tabIndex -1: focus lands here after a row is removed (that row's button is gone). */}
        <h2 id="grants-heading" tabIndex={-1} className="text-[18px] font-bold text-ink outline-none">
          Who has access
        </h2>
        <p id="access-announcer" role="status" aria-live="polite" className="sr-only" />
        {!result.ok ? (
          <RetryErrorState message={result.error?.message ?? "We couldn't load access settings. Please try again."} />
        ) : (result.data ?? []).length === 0 ? (
          <div className="glass-regular rounded-card">
            <EmptyState title="No one has access yet" description="Grant access above to give someone an area." />
          </div>
        ) : (
          <ListPanel>
            {result.data!.map((grant) => {
              const areaLabel = ADMIN_AREA_LABELS[grant.area];
              const isSelfSuper = grant.userId === userId && grant.area === "super";
              return (
                <ListRow key={`${grant.userId}:${grant.area}`}>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-ink">{grant.fullName || grant.email}</p>
                    <p className="truncate text-[13px] text-ink-secondary">{grant.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {/* A category, not a status: plain text, no status colour (§7.1/§7.2). */}
                    <span className="glass-thin rounded-control px-2.5 py-1 text-[12px] text-ink-secondary">{areaLabel}</span>
                    {isSelfSuper ? (
                      <span className="flex size-11 items-center justify-center text-[12px] text-ink-secondary">You</span>
                    ) : (
                      <RevokeAccessButton userId={grant.userId} area={grant.area} areaLabel={areaLabel} email={grant.email} />
                    )}
                  </div>
                </ListRow>
              );
            })}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
