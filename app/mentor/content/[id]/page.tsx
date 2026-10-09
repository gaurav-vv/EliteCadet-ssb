import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { AssignmentPanel } from "@/components/admin/content/assignment-panel";
import { ContentForm } from "@/components/admin/content/content-form";
import { CategoryTag, ContentStatusTag } from "@/components/content/content-tags";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { ListPanel, ListRow } from "@/components/ui/list-panel";
import { changeMyContentStatusAction, unassignMyContentAction } from "@/lib/actions/mentor-content";
import { getMyContentItem } from "@/lib/server/content/mentor-service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Edit content" };

// Only the mentor's own content; anything else is "not found".
export default async function EditMyContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getMyContentItem(id);
  if (!result.ok && result.error?.code === "not_found") notFound();
  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/mentor/content" className="text-[13px] text-ink-secondary no-underline">‹ My Content</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this content. Please try again."} />
      </div>
    );
  }
  const { content, assignments, batches } = result.data;
  const status = (to: string, label: string, title: string, description: string, destructive = false) => (
    <ConfirmActionDialog triggerLabel={label} title={title} description={description} confirmLabel={label} destructive={destructive} action={changeMyContentStatusAction.bind(null, content.id, to)} />
  );
  const shared = new Set(assignments.map((a) => a.batchId));

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/mentor/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        My Content
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-ink">{content.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
            <ContentStatusTag status={content.status} />
            <CategoryTag category={content.category} />
            {content.templateSourceId && <span>From a template</span>}
            <span>Updated {formatDay(content.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {content.status === "draft" && status("published", "Publish", "Publish this content?", "Students in the batches you share it with will see it straight away.")}
          {content.status === "published" && status("draft", "Unpublish", "Move back to draft?", "Your students will no longer see it until you publish again.")}
          {content.status !== "archived" && status("archived", "Archive", "Archive this content?", "It's hidden from your students but kept. You can restore it as a draft.", true)}
          {content.status === "archived" && status("draft", "Restore as draft", "Restore this content?", "It comes back as a draft.")}
        </div>
      </div>

      <ContentForm content={content} mode="mentor" />

      <section aria-labelledby="share-heading" className="flex flex-col gap-3">
        <h2 id="share-heading" className="text-[18px] font-bold text-ink">Shared with</h2>
        <p className="text-[13px] text-ink-secondary">Only students in these batches see it, once it&apos;s published. You can only share with batches you teach.</p>
        <div className="glass-regular rounded-card px-5 py-5">
          <AssignmentPanel mode="mentor" contentId={content.id} academies={[]} batches={batches.filter((b) => !shared.has(b.id))} />
        </div>
        {assignments.length > 0 && (
          <ListPanel>
            {assignments.map((a) => (
              <ListRow key={a.id}>
                <span className="text-sm text-ink">{a.label}</span>
                <ConfirmActionDialog triggerLabel="Remove" triggerAriaLabel={`Stop sharing with ${a.label}`} title="Stop sharing with this batch?" description={`${a.label} will no longer see this content.`} confirmLabel="Remove" destructive action={unassignMyContentAction.bind(null, content.id, a.id)} />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
