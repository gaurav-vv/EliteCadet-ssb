import Link from "next/link";
import { ArrowRight, BookOpen, Brain, CalendarDays, Clock, Lightbulb, Newspaper, UserRound, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";
import { ResourcePhotoImage } from "@/components/student/resources/resource-photo";
import { ResourceReadBadge } from "@/components/student/resource-read-badge";
import { resourcesBase, type ResourceAudience } from "@/lib/resources/paths";
import { formatDay } from "@/lib/utils/format-date";
import type { ResourceCategory, ResourceSummary } from "@/types/resources";

// Shared building blocks for /student/resources (main page, category pages,
// article pages). Server components only; icons stay inside this file.

export const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
  "Psychology Tests": Brain,
  "Interview Preparation": UserRound,
  "Group Tasks": Users,
  "Current Affairs": Newspaper,
  "Exam Guidance": BookOpen,
  "Tips & Strategies": Lightbulb,
};

// Category label pill — the label is always text, so tone is never the only cue.
const TAG_TONE: Record<ResourceCategory, string> = {
  "Psychology Tests": "bg-violet-50 text-violet-700",
  "Interview Preparation": "bg-amber-50 text-amber-800",
  "Group Tasks": "bg-orange-50 text-orange-800",
  "Current Affairs": "bg-emerald-50 text-emerald-800",
  "Exam Guidance": "bg-sky-50 text-sky-800",
  "Tips & Strategies": "bg-yellow-50 text-yellow-800",
};

export const CATEGORY_ICON_TONE: Record<ResourceCategory, string> = {
  "Psychology Tests": "bg-violet-50 text-violet-600",
  "Interview Preparation": "bg-amber-50 text-amber-600",
  "Group Tasks": "bg-emerald-50 text-emerald-600",
  "Current Affairs": "bg-sky-50 text-sky-600",
  "Exam Guidance": "bg-indigo-50 text-indigo-600",
  "Tips & Strategies": "bg-yellow-50 text-yellow-600",
};

export function CategoryTag({ category, className }: { category: ResourceCategory; className?: string }) {
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", TAG_TONE[category], className)}>{category}</span>;
}

export function ResourceMeta({ resource, className }: { resource: Pick<ResourceSummary, "updatedOn" | "readingMinutes">; className?: string }) {
  return (
    <span className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary", className)}>
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden="true" size={14} />
        <span className="sr-only">Updated </span>
        <time dateTime={resource.updatedOn}>{formatDay(resource.updatedOn)}</time>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock aria-hidden="true" size={14} />
        {resource.readingMinutes} min read
      </span>
    </span>
  );
}

// Links stay inside the viewer's own workspace. "Read" state is a student's own progress, so it is only shown to students.
const href = (slug: string, audience: ResourceAudience) => `${resourcesBase(audience)}/${slug}`;

function GoArrow() {
  return (
    <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-accent/10 text-brand-accent transition-transform duration-200 group-hover:translate-x-0.5">
      <ArrowRight size={15} />
    </span>
  );
}

// Featured Resources: tall card with the cover on top.
export function FeaturedResourceCard({ resource, audience = "student" }: { resource: ResourceSummary; audience?: ResourceAudience }) {
  return (
    <Link href={href(resource.slug, audience)} className="glass-regular glass-hover-lift group flex h-full flex-col overflow-hidden rounded-card no-underline">
      <span className="relative block aspect-[16/9] overflow-hidden">
        <ResourcePhotoImage
          photo={resource.photo}
          sizes="(min-width: 1536px) 260px, (min-width: 640px) 50vw, 100vw"
          className="transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none"
        />
        <CategoryTag category={resource.category} className="absolute bottom-2.5 left-3 bg-white/95 shadow-sm" />
      </span>
      <span className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[16px] leading-snug font-semibold text-ink">{resource.title}</span>
        <span className="line-clamp-3 text-[13px] leading-relaxed text-ink-secondary">{resource.description}</span>
        <span className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="flex items-center gap-3 text-[12px] text-ink-secondary">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" size={13} />
              {resource.readingMinutes} min
            </span>
            {audience === "student" && <ResourceReadBadge slug={resource.slug} />}
          </span>
          <GoArrow />
        </span>
      </span>
    </Link>
  );
}

// All Resources / category pages: horizontal card, thumbnail on the left.
export function ResourceListCard({ resource, audience = "student" }: { resource: ResourceSummary; audience?: ResourceAudience }) {
  return (
    <Link href={href(resource.slug, audience)} className="glass-regular glass-hover-lift group flex h-full gap-4 overflow-hidden rounded-card p-3 no-underline">
      <span className="relative block aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl sm:w-36">
        <ResourcePhotoImage photo={resource.photo} sizes="144px" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <CategoryTag category={resource.category} />
        <span className="text-[15px] leading-snug font-semibold text-ink">{resource.title}</span>
        <span className="line-clamp-2 text-[13px] text-ink-secondary">{resource.description}</span>
        <span className="mt-auto flex items-end justify-between gap-2 pt-1">
          <span className="flex flex-col gap-1">
            <ResourceMeta resource={resource} />
            {audience === "student" && <ResourceReadBadge slug={resource.slug} />}
          </span>
          <GoArrow />
        </span>
      </span>
    </Link>
  );
}

// Right-hand panel shell (Quick Links, Popular Resources, Categories).
export function SidePanel({ title, titleId, children, footnote }: { title: string; titleId: string; children: React.ReactNode; footnote?: string }) {
  return (
    <section aria-labelledby={titleId} className="glass-regular flex flex-col gap-3 rounded-card p-4">
      <h2 id={titleId} className="text-[17px] font-semibold text-ink">
        {title}
      </h2>
      {children}
      {footnote && <p className="text-[11px] text-ink-secondary">{footnote}</p>}
    </section>
  );
}
