// Single source of truth for Day 2 category metadata — labels, URL slugs and
// beginner-friendly explanations shared by the overview page, the journey
// strip, the category grid and every dedicated category page. These are
// general, publicly-known definitions of each SSB test format, not a claim
// about any specific resource, so they stay accurate even as the curated
// resource list (lib/mock/day2-resources.ts) changes.
//
// Icons are exported from here too (as component references, not strings) —
// that's safe because every consumer imports this module directly and
// renders the icon itself; nothing passes an icon *as a prop* across a
// Server → Client boundary, which is the specific case AGENTS.md §7.12 rules
// out.
import { Image as ImageIcon, Type as TypeIcon, MessageSquare, UserCircle, Layers, type LucideIcon } from "lucide-react";
import type { Day2TestCategory } from "@/types/day2-resources";

export const DAY2_CATEGORIES: Day2TestCategory[] = ["tat", "wat", "srt", "sdt", "full-day-2"];

/** URL slug used under /student/resources/day-2/[slug]. */
export const DAY2_CATEGORY_SLUGS: Record<Day2TestCategory, string> = {
  tat: "tat",
  wat: "wat",
  srt: "srt",
  sdt: "sd-sdt",
  "full-day-2": "full-day",
};

export const DAY2_SLUG_TO_CATEGORY: Record<string, Day2TestCategory> = Object.fromEntries(
  Object.entries(DAY2_CATEGORY_SLUGS).map(([category, slug]) => [slug, category as Day2TestCategory]),
);

export const DAY2_CATEGORY_ICONS: Record<Day2TestCategory, LucideIcon> = {
  tat: ImageIcon,
  wat: TypeIcon,
  srt: MessageSquare,
  sdt: UserCircle,
  "full-day-2": Layers,
};

/** CSS custom-property reference for each test's accent (app/globals.css §7 Day 2 exception).
 *  Consumers set this as an inline `--cat-accent` style, never a literal colour. */
export const DAY2_CATEGORY_ACCENT: Record<Day2TestCategory, string> = {
  tat: "var(--day2-tat)",
  wat: "var(--day2-wat)",
  srt: "var(--day2-srt)",
  sdt: "var(--day2-sdt)",
  "full-day-2": "var(--day2-full)",
};

interface Day2CategoryMeta {
  shortLabel: string;
  fullName: string;
  /** Two or three words — used only in the journey strip, where space is tightest. */
  microLabel: string;
  /** One line — used as flip-card front subtitle and card metadata. */
  oneLiner: string;
  /** One to two sentences — used as the flip-card back and the category page's "What is X?" copy. */
  explanation: string;
}

export const DAY2_CATEGORY_META: Record<Day2TestCategory, Day2CategoryMeta> = {
  tat: {
    shortLabel: "TAT",
    fullName: "Thematic Apperception Test",
    microLabel: "Picture Stories",
    oneLiner: "Write a short story about an ambiguous picture.",
    explanation:
      "You're shown a set of ambiguous pictures and asked to write a short story about each one. Assessors read how you think and what you value — not how well you draw or write.",
  },
  wat: {
    shortLabel: "WAT",
    fullName: "Word Association Test",
    microLabel: "Word Association",
    oneLiner: "React instantly to a fast series of ordinary words.",
    explanation:
      "A fast series of ordinary words flashes past, and you write your very first reaction to each. There's no time to plan a clever answer — that's the point.",
  },
  srt: {
    shortLabel: "SRT",
    fullName: "Situation Reaction Test",
    microLabel: "Situational Response",
    oneLiner: "Decide how you'd handle everyday and stressful situations.",
    explanation:
      "You're given everyday and stressful situations and asked how you'd react. Brief, practical responses matter more than perfectly-worded ones.",
  },
  sdt: {
    shortLabel: "SD/SDT",
    fullName: "Self Description Test",
    microLabel: "Self Description",
    oneLiner: "Describe yourself, honestly and briefly.",
    explanation:
      "You describe yourself as you, your parents, teachers and friends would see you. Honesty matters far more than a polished self-image.",
  },
  "full-day-2": {
    shortLabel: "Full Day 2",
    fullName: "Complete Day 2 Practice",
    microLabel: "Complete Practice",
    oneLiner: "Run TAT, WAT, SRT and SD back-to-back.",
    explanation:
      "Runs TAT, WAT, SRT and SD back-to-back under realistic timing — the closest rehearsal to how the actual test day feels.",
  },
};
