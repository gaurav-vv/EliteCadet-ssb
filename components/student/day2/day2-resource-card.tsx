"use client";

import {
  Newspaper,
  PlayCircle,
  Globe,
  Smartphone,
  Timer,
  ClipboardCheck,
  FileText,
  BookOpen,
  GraduationCap,
  ExternalLink,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { DAY2_CATEGORY_ACCENT } from "@/lib/day2/categories";
import { recordRecentlyViewed } from "@/lib/day2/recently-viewed";
import type { Day2Resource, Day2ResourceType, Day2ResourcePurpose } from "@/types/day2-resources";
import { cn } from "cn";

// Icons resolved locally from data fields — never passed as a component
// reference across the Server → Client boundary (AGENTS.md §7.12).
const TYPE_ICONS: Record<Day2ResourceType, LucideIcon> = {
  article: Newspaper,
  video: PlayCircle,
  "web-app": Globe,
  "mobile-app": Smartphone,
  simulator: Timer,
  test: ClipboardCheck,
  pdf: FileText,
  book: BookOpen,
  course: GraduationCap,
};

// Priority order for picking the one purpose worth showing as the card's
// tiny type label — a resource can carry several (e.g. both "practice" and
// "timed-practice"); this picks the most specific one.
const PURPOSE_PRIORITY: Day2ResourcePurpose[] = [
  "feedback",
  "full-mock",
  "timed-practice",
  "test-series",
  "practice",
  "example",
  "learn",
  "supporting",
];

const PURPOSE_LABELS: Record<Day2ResourcePurpose, string> = {
  learn: "Learn",
  example: "Example",
  practice: "Practice",
  "timed-practice": "Timed Practice",
  "test-series": "Test Series",
  "full-mock": "Full Mock",
  feedback: "Feedback",
  supporting: "Reference",
};

function primaryPurposeLabel(purpose: Day2ResourcePurpose[]): string | null {
  const match = PURPOSE_PRIORITY.find((p) => purpose.includes(p));
  return match ? PURPOSE_LABELS[match] : null;
}

function ctaLabel(resource: Day2Resource): string {
  if (resource.resourceType === "video") return "Watch Video";
  if (resource.resourceType === "pdf") return "View PDF";
  if (resource.resourceType === "test") return "View Test";
  if (resource.resourceType === "article") return "Read Article";
  if (resource.purpose.some((p) => ["practice", "timed-practice", "test-series", "full-mock"].includes(p))) return "Start Practice";
  return "Open Resource";
}

interface Day2ResourceCardProps {
  resource: Day2Resource;
  highlighted?: boolean;
}

// Redesigned to be scannable in 2–3 seconds and to speak to a student, not a
// researcher: icon + type, title, one short clamped sentence, one CTA.
// Deliberately drops verification badges and pricing/access labels from the
// card face (redesign brief §14–16) — that research/curation metadata still
// lives in the underlying data (lib/mock/day2-resources.ts), it just isn't
// printed here.
export function Day2ResourceCard({ resource, highlighted = false }: Day2ResourceCardProps) {
  const TypeIcon = TYPE_ICONS[resource.resourceType];
  const purposeLabel = primaryPurposeLabel(resource.purpose);
  const accent = DAY2_CATEGORY_ACCENT[resource.category];

  return (
    <article
      className={cn(
        "glass-regular glass-hover-lift day2-cat-hover group flex h-full flex-col gap-3 rounded-card border border-transparent px-5 py-5",
        highlighted && "shadow-glow-accent",
      )}
      style={{ "--cat-accent": accent } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5">
        <span className="day2-cat-wash day2-cat-icon flex size-9 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-105">
          <TypeIcon aria-hidden="true" size={16} />
        </span>
        {purposeLabel && (
          <span className="day2-cat-icon text-[10.5px] font-semibold tracking-[0.05em] uppercase">{purposeLabel}</span>
        )}
      </div>

      <div>
        <h3 className="text-[15px] font-semibold text-ink">{resource.name}</h3>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-secondary line-clamp-2">{resource.description}</p>
      </div>

      {resource.feedbackKind === "ai" && resource.aiFeedbackConfidence && (
        <p
          className="flex items-center gap-1.5 text-[11px] text-ink-secondary"
          title={resource.aiFeedbackConfidence}
        >
          <Sparkles aria-hidden="true" size={12} />
          AI feedback — accuracy varies
        </p>
      )}

      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => recordRecentlyViewed({ id: resource.id, name: resource.name, category: resource.category, url: resource.url })}
        className="day2-cat-icon glass-thin mt-auto inline-flex w-fit items-center gap-1.5 self-start rounded-button px-3.5 py-2 text-[13px] font-semibold no-underline transition-transform duration-200 hover:scale-[1.02]"
      >
        {ctaLabel(resource)}
        <ExternalLink aria-hidden="true" size={13} />
        <span className="sr-only"> (opens {resource.platform} in a new tab)</span>
      </a>
    </article>
  );
}
