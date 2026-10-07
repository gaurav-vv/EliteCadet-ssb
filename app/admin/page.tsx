import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { ADMIN_AREA_LABELS, canAccess } from "@/lib/admin/access";
import { requireAdminArea } from "@/lib/auth/admin";
import type { AdminArea } from "@/types/admin";

export const metadata: Metadata = { title: "Admin" };

const AREAS: { area: Exclude<AdminArea, "super">; href: string; description: string }[] = [
  { area: "student_content", href: "/admin/student-content", description: "Practice banks, journey modules and resources." },
  { area: "mentor_content", href: "/admin/mentor-content", description: "Evaluation rubrics, session templates and guidance." },
  { area: "academy_content", href: "/admin/academy-content", description: "Students, batches, mentors and settings." },
];

export default async function AdminOverviewPage() {
  const { grants } = await requireAdminArea("any");
  const available = AREAS.filter((a) => canAccess(grants, a.area));

  return (
    <div className="flex flex-col gap-8 pb-10">
      <PageHeader title="Admin" subtitle="Add and manage the content you've been given access to." />

      <section aria-labelledby="areas-heading" className="flex flex-col gap-3">
        <h2 id="areas-heading" className="text-[18px] font-bold text-ink">
          Your areas
        </h2>
        <ListPanel>
          {available.map((a) => (
            <ListRow key={a.area} href={a.href}>
              <div>
                <p className="text-sm text-ink">{ADMIN_AREA_LABELS[a.area]}</p>
                <p className="text-[13px] text-ink-secondary">{a.description}</p>
              </div>
            </ListRow>
          ))}
          {canAccess(grants, "super") && (
            <ListRow href="/admin/access">
              <div>
                <p className="text-sm text-ink">Access</p>
                <p className="text-[13px] text-ink-secondary">Choose who can edit which area.</p>
              </div>
            </ListRow>
          )}
        </ListPanel>
        <p className="text-[12px] text-ink-secondary">
          Need access to another area? Ask a super admin — only they can grant it.{" "}
          <Link href="/" className="text-brand-accent">
            Back to site
          </Link>
        </p>
      </section>
    </div>
  );
}
