// The Student Resources library: every editorial article, in library order.
// lib/api/resources.ts is the only consumer; pages never import this directly.

import { RESOURCE_CATEGORIES, type ResourceArticle, type ResourceCategory, type ResourceDetail, type ResourcePhoto } from "@/types/resources";
import { EXAM_STRATEGY_RESOURCES } from "./exam-strategy";
import { INTERVIEW_GTO_RESOURCES } from "./interview-gto";
import { RESOURCE_PHOTOS } from "./photos";
import { PSYCHOLOGY_RESOURCES } from "./psychology";

const WORDS_PER_MINUTE = 200;

function wordCount(a: ResourceArticle): number {
  const text = [
    a.title,
    ...a.objectives,
    ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? []), s.example?.text ?? ""]),
    ...a.exercises.flatMap((e) => [e.title, e.instructions]),
    ...a.takeaways,
  ].join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export const readingMinutes = (a: ResourceArticle) => Math.max(1, Math.ceil(wordCount(a) / WORDS_PER_MINUTE));

const ARTICLES: ResourceArticle[] = [...PSYCHOLOGY_RESOURCES, ...INTERVIEW_GTO_RESOURCES, ...EXAM_STRATEGY_RESOURCES];

// Each article has its own photo; should one ever be missing, use another real
// photo from the same category (never an illustration or a grey box).
function photoFor(a: ResourceArticle): ResourcePhoto {
  const own = RESOURCE_PHOTOS[a.slug];
  if (own) return own;
  const sibling = ARTICLES.find((b) => b.category === a.category && RESOURCE_PHOTOS[b.slug]);
  return RESOURCE_PHOTOS[sibling?.slug ?? Object.keys(RESOURCE_PHOTOS)[0]];
}

export const LIBRARY: ResourceDetail[] = ARTICLES.map((a) => ({
  ...a,
  readingMinutes: readingMinutes(a),
  photo: photoFor(a),
}));

// URL-safe category slugs (/student/resources/category/[category], ?category=).
export const CATEGORY_SLUGS: Record<ResourceCategory, string> = {
  "Psychology Tests": "psychology-tests",
  "Interview Preparation": "interview-preparation",
  "Group Tasks": "group-tasks",
  "Current Affairs": "current-affairs",
  "Exam Guidance": "exam-guidance",
  "Tips & Strategies": "tips-and-strategies",
};

export const categoryFromSlug = (slug: string | undefined): ResourceCategory | null =>
  RESOURCE_CATEGORIES.find((c) => CATEGORY_SLUGS[c] === slug) ?? null;

export const CATEGORY_DESCRIPTIONS: Record<ResourceCategory, string> = {
  "Psychology Tests": "TAT, WAT, SRT and SDT — formats, habits and practice sets for the Day 2 psychology series.",
  "Interview Preparation": "Your PIQ, common question themes and a calm plan for interview day.",
  "Group Tasks": "GTO tasks, group discussion, planning exercises, lecturettes and obstacles.",
  "Current Affairs": "How to follow defence news, core national-security background, and dated official releases.",
  "Exam Guidance": "NDA and CDS preparation, syllabus planning and reading official notifications.",
  "Tips & Strategies": "Officer Like Qualities, consistency across tests, schedules and revision plans.",
};

// "Popular Resources" is an editorial starting list — EliteCadet has no
// readership data, so no counts or rankings are claimed. Picks are canonical
// library slugs outside the Featured four, so the main page never shows the
// same resource in both places.
export const EDITORS_PICKS = [
  "interview-day-checklist",
  "gto-tasks-effective-participation",
  "staying-consistent-across-tests",
  "nda-preparation-roadmap",
  "defence-current-affairs-essentials",
];
