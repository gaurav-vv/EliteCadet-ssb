// Single source of truth for the second-level "what do you want to do?"
// sections on a Day 2 category page (Learn / Practice / Tests / Videos /
// Articles / Feedback) — the layer between picking a test (TAT/WAT/SRT/
// SD/SDT) and seeing any individual resource. A category page only ever
// renders the sections that actually match a resource in that category's
// curated list (lib/mock/day2-resources.ts) — never an empty section.
//
// Icons are exported as component references, not strings, on the same
// reasoning as lib/day2/categories.ts: every consumer imports this module
// directly and renders the icon itself, so nothing crosses a Server → Client
// boundary as a prop (AGENTS.md §7.12).
import { BookOpen, PenSquare, ClipboardCheck, PlayCircle, Newspaper, MessageCircle, type LucideIcon } from "lucide-react";
import type { Day2Resource, Day2ResourcePurpose } from "@/types/day2-resources";

export type Day2SectionKey = "learn" | "practice" | "tests" | "video" | "article" | "feedback";

export interface Day2SectionDef {
  key: Day2SectionKey;
  label: string;
  /** Front-of-card micro copy — a few words, not a sentence. */
  oneLiner: string;
  /** Back-of-card explanation — one short sentence. */
  backText: string;
  icon: LucideIcon;
  match: (r: Day2Resource) => boolean;
}

const TEST_PURPOSES: Day2ResourcePurpose[] = ["test-series", "full-mock"];

export const DAY2_SECTIONS: Day2SectionDef[] = [
  {
    key: "learn",
    label: "Learn Basics",
    oneLiner: "Understand the format.",
    backText: "Short guides to how this test works.",
    icon: BookOpen,
    match: (r) => r.purpose.includes("learn"),
  },
  {
    key: "practice",
    label: "Practice",
    oneLiner: "Try it yourself.",
    backText: "Practice sets and timed simulators.",
    icon: PenSquare,
    match: (r) => r.purpose.some((p) => p === "practice" || p === "timed-practice"),
  },
  {
    key: "tests",
    label: "Tests",
    oneLiner: "Full mock sets.",
    backText: "Structured test series and full mocks.",
    icon: ClipboardCheck,
    match: (r) => r.resourceType === "test" || r.purpose.some((p) => TEST_PURPOSES.includes(p)),
  },
  {
    key: "video",
    label: "Videos",
    oneLiner: "Watch it explained.",
    backText: "Short videos on approach and technique.",
    icon: PlayCircle,
    match: (r) => r.resourceType === "video",
  },
  {
    key: "article",
    label: "Articles",
    oneLiner: "Read a write-up.",
    backText: "Written breakdowns and tips.",
    icon: Newspaper,
    match: (r) => r.resourceType === "article",
  },
  {
    key: "feedback",
    label: "Feedback",
    oneLiner: "Get reviewed.",
    backText: "Have a real attempt reviewed.",
    icon: MessageCircle,
    match: (r) => r.purpose.includes("feedback"),
  },
];

/** Sections that have at least one matching resource, each carrying its live count — never an empty section. */
export function getAvailableSections(resources: Day2Resource[]): (Day2SectionDef & { count: number })[] {
  return DAY2_SECTIONS.map((s) => ({ ...s, count: resources.filter(s.match).length })).filter((s) => s.count > 0);
}
