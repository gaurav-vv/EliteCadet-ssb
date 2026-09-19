// MOCK CONTENT — isolated per AGENTS.md §8, same rationale as lib/mock/practice.ts.
// A real content/CMS pipeline replaces this file only; lib/api/resources.ts
// and every component stay the same.

import type { ResourceDetail } from "@/types/resources";

export const RESOURCES: ResourceDetail[] = [
  {
    slug: "understanding-tat",
    title: "Understanding the TAT",
    category: "Psychology Tests",
    description: "What assessors actually look for in a TAT story, and common mistakes to avoid.",
    body: "The Thematic Apperception Test isn't about writing a dramatic story — it's about showing a believable, positive, action-oriented response to an ambiguous situation. Keep your stories realistic, give the character a clear goal, and always resolve the story with an outcome. Avoid overly negative, violent, or fantastical themes.",
  },
  {
    slug: "wat-response-habits",
    title: "Building better WAT response habits",
    category: "Psychology Tests",
    description: "Why your first instinct matters more than a clever sentence.",
    body: "WAT rewards speed and consistency, not cleverness. Write the first meaningful sentence that comes to mind — a positive, natural association with the word. Avoid overthinking, avoid negative or violent associations, and keep sentences short and grammatically simple so you can keep pace with the 15-second window.",
  },
  {
    slug: "srt-decisiveness",
    title: "Practising decisiveness for the SRT",
    category: "Psychology Tests",
    description: "How to react to a situation instead of describing it.",
    body: "A strong SRT response states what you would DO, not what you feel or think about the situation. Keep it to one or two sentences, be specific and practical, and favor responses that show initiative, responsibility and consideration for others.",
  },
  {
    slug: "sdt-honest-self-description",
    title: "Writing an honest Self Description",
    category: "Psychology Tests",
    description: "Why consistency across all five SDT prompts matters more than praise.",
    body: "Assessors specifically look for consistency across your five self-description answers. Don't inflate any single trait — describe yourself the way people who actually know you would, including a genuine area you're working to improve.",
  },
  {
    slug: "interview-day-checklist",
    title: "SSB Interview day checklist",
    category: "Interview Preparation",
    description: "What to prepare, carry and review the night before your interview.",
    body: "Review your PIQ (Personal Information Questionnaire) form thoroughly — interviewers ask directly from it. Prepare concise answers about your background, hobbies, and reasons for choosing the forces. Get a full night's sleep, and carry all required original documents.",
  },
  {
    slug: "staying-consistent-across-tests",
    title: "Staying consistent across every test",
    category: "General Preparation",
    description: "Assessors compare your TAT, WAT, SRT, SDT and interview answers against each other.",
    body: "The five techniques together build one picture of you. A conflict between what you write in the SDT and how you behave in a Group Task or answer in the interview stands out immediately. Practice with the same honest self-assessment across every activity.",
  },
];

export function getResourceCategories(): string[] {
  return Array.from(new Set(RESOURCES.map((r) => r.category)));
}

export function getResourceBySlug(slug: string): ResourceDetail | undefined {
  return RESOURCES.find((r) => r.slug === slug);
}
