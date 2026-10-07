import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ADMIN_AREA_LABELS } from "@/lib/admin/access";
import { requireAdminArea } from "@/lib/auth/admin";
import type { AdminArea } from "@/types/admin";

// Guarded landing page for a content area whose editor hasn't shipped yet.
// Each panel's branch replaces its page's body; the guard stays (T081–T083).
export async function AreaPlaceholder({ area, subtitle }: { area: Exclude<AdminArea, "super">; subtitle: string }) {
  await requireAdminArea(area);

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title={ADMIN_AREA_LABELS[area]} subtitle={subtitle} />
      <div className="glass-regular rounded-card">
        <EmptyState title="Content tools are on the way" description="You have access to this area. Editing tools arrive in an upcoming release." />
      </div>
    </div>
  );
}
