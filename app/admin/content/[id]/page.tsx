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
import { changeContentStatusAction, removeContentAssignmentAction } from "@/lib/actions/content";
import { getAcademyOptions } from "@/lib/server/academies/service";
import { getAssignmentTargets, getContentForEdit } from "@/lib/server/content/service";
import { formatDay } from "@/lib/utils/format-date";

export const metadata: Metadata = { title: "Edit content" };

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, academies, targets] = await Promise.all([getContentForEdit(id), getAcademyOptions(), getAssignmentTargets()]);
  if (!result.ok && result.error?.code === "not_found") notFound();

  if (!result.ok || !result.data) {
    return (
      <div className="flex flex-col gap-6">
        <Link href="/admin/content" className="text-[13px] text-ink-secondary no-underline">‹ Content Library</Link>
        <RetryErrorState message={result.error?.message ?? "We couldn't load this content. Please try again."} />
      </div>
    );
  }

  const { content, assignments } = result.data;
  const status = (to: string, label: string, title: string, description: string, destructive = false) => (
    <ConfirmActionDialog triggerLabel={label} title={title} description={description} confirmLabel={label} destructive={destructive} action={changeContentStatusAction.bind(null, content.id, to)} />
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Link href="/admin/content" className="inline-flex w-fit items-center gap-1 text-[13px] text-ink-secondary no-underline hover:text-ink">
        <ChevronLeft aria-hidden="true" size={16} />
        Content Library
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-bold text-ink">{content.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-secondary">
            <ContentStatusTag status={content.status} />
            <CategoryTag category={content.category} />
            <span>Updated {formatDay(content.updatedAt)}</span>
            {content.publishedAt && <span>· Published {formatDay(content.publishedAt)}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {content.status === "draft" && status("published", "Publish", "Publish this content?", "It becomes visible to its audience straight away.")}
          {content.status === "published" && status("draft", "Unpublish", "Move back to draft?", "Readers will no longer see it until you publish again.")}
          {content.status !== "archived" && status("archived", "Archive", "Archive this content?", "It's hidden from everyone but kept. You can restore it as a draft.", true)}
          {content.status === "archived" && status("draft", "Restore as draft", "Restore this content?", "It comes back as a draft, not visible until published.")}
        </div>
      </div>

      <ContentForm content={content} />

      <section aria-labelledby="assign-heading" className="flex flex-col gap-3">
        <h2 id="assign-heading" className="text-[18px] font-bold text-ink">Assignments</h2>
        <p className="text-[13px] text-ink-secondary">
          {content.visibility === "everyone"
            ? "Visible to everyone in its audience, so assignments aren't needed. Switch “Who can see it” to “Assigned” to limit it."
            : "Only these academies and batches can see it."}
        </p>
        <div className="glass-regular rounded-card px-5 py-5">
          <AssignmentPanel contentId={content.id} academies={academies.data ?? []} batches={targets.data?.batches ?? []} />
        </div>
        {assignments.length > 0 && (
          <ListPanel>
            {assignments.map((a) => (
              <ListRow key={a.id}>
                <span className="text-sm text-ink">{a.label}</span>
                <ConfirmActionDialog triggerLabel="Remove" triggerAriaLabel={`Remove assignment ${a.label}`} title="Remove assignment?" description={`${a.label} will no longer receive this content (if it's assigned-only).`} confirmLabel="Remove" destructive action={removeContentAssignmentAction.bind(null, content.id, a.id)} />
              </ListRow>
            ))}
          </ListPanel>
        )}
      </section>
    </div>
  );
}
