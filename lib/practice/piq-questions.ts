// PIQ-based interview questions (specs.md §6.4b). Built from fixed templates
// on the student's own PIQ entries — no AI and no network call, so it works
// offline and can never say anything the templates don't. The templates are
// placeholder content written for this app, not an official IO question set.

import type { GuidedPracticeItem } from "@/types/ssb-journey";

export type PiqField =
  | "hometown"
  | "education"
  | "favouriteSubject"
  | "sports"
  | "hobbies"
  | "activities"
  | "achievements"
  | "previousAttempts";

export type PiqInput = Partial<Record<PiqField, string>>;

export const PIQ_MAX_LENGTH = 120;

export const PIQ_FIELDS: { key: PiqField; label: string; placeholder: string }[] = [
  { key: "hometown", label: "Hometown or where you grew up", placeholder: "e.g. Nashik, Maharashtra" },
  { key: "education", label: "Current or highest education", placeholder: "e.g. B.Sc. Physics, 2nd year" },
  { key: "favouriteSubject", label: "Favourite subject", placeholder: "e.g. Mathematics" },
  { key: "sports", label: "Sports or games you play", placeholder: "e.g. Football (defender)" },
  { key: "hobbies", label: "Hobbies", placeholder: "e.g. Sketching, trekking" },
  { key: "activities", label: "NCC, NSS, clubs or responsibilities", placeholder: "e.g. NCC 'B' certificate, sports secretary" },
  { key: "achievements", label: "An achievement you're proud of", placeholder: "e.g. District-level debate winner" },
  { key: "previousAttempts", label: "Previous SSB attempts (if any)", placeholder: "e.g. One, screened out in 2025" },
];

type Template = { assesses: string; prompt: (value: string) => string };

const TEMPLATES: Record<PiqField, Template[]> = {
  hometown: [
    {
      assesses: "Awareness of where you come from and whether you notice real problems.",
      prompt: (v) => `Tell us about ${v}. What is it known for, and what is one problem there you would like to fix?`,
    },
    {
      assesses: "Whether you follow what happens around you.",
      prompt: (v) => `What is one recent development or issue in ${v} or your state?`,
    },
  ],
  education: [
    {
      assesses: "Whether your choices were deliberate.",
      prompt: (v) => `Why did you choose ${v}, and how has it prepared you for life as an officer?`,
    },
    {
      assesses: "Honesty about your academic record.",
      prompt: (v) => `How are you doing in ${v}, and what would you change about how you study?`,
    },
  ],
  favouriteSubject: [
    {
      assesses: "Genuine interest and how clearly you explain things.",
      prompt: (v) => `Your favourite subject is ${v}. Explain one idea from it simply, as if to a friend.`,
    },
  ],
  sports: [
    {
      assesses: "Whether the sport is really yours and how you work in a team.",
      prompt: (v) => `You play ${v}. What position or role do you take, and what is the best team moment you've had?`,
    },
    {
      assesses: "Current activity and fitness habits.",
      prompt: (v) => `When did you last play ${v}, and how else do you keep fit?`,
    },
  ],
  hobbies: [
    {
      assesses: "Whether the hobbies in your PIQ are active, not just listed.",
      prompt: (v) => `You listed ${v}. When did you last spend time on it, and what have you got out of it?`,
    },
  ],
  activities: [
    {
      assesses: "Responsibility you actually carried.",
      prompt: (v) => `Tell us about ${v}. What exactly was your responsibility, and what did you learn from it?`,
    },
  ],
  achievements: [
    {
      assesses: "Effort behind the result and honest reflection.",
      prompt: (v) => `You mentioned ${v}. How did you achieve it, and what would you do differently now?`,
    },
  ],
  previousAttempts: [
    {
      assesses: "Whether you reflected on the last attempt and improved.",
      prompt: (v) => `This is not your first SSB (${v}). What have you changed since your last attempt?`,
    },
  ],
};

const PIQ_TIPS = [
  "Be specific: the IO follows up on every detail you give.",
  "Stay consistent with exactly what you wrote in your PIQ.",
];

// Short, stable hash so an item id changes when the PIQ entry it quotes
// changes, and an old saved answer never shows up under a new question.
function hash(value: string): string {
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = ((h << 5) + h + value.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function normalisePiq(input: PiqInput): PiqInput {
  const out: PiqInput = {};
  for (const { key } of PIQ_FIELDS) {
    const value = input[key]?.trim().slice(0, PIQ_MAX_LENGTH);
    if (value) out[key] = value;
  }
  return out;
}

export function validatePiq(input: PiqInput): string | null {
  return Object.keys(normalisePiq(input)).length === 0 ? "Fill in at least one field to get your questions." : null;
}

export function buildPiqQuestions(input: PiqInput): GuidedPracticeItem[] {
  const piq = normalisePiq(input);
  return PIQ_FIELDS.flatMap(({ key }) => {
    const value = piq[key];
    if (!value) return [];
    return TEMPLATES[key].map((template, i) => ({
      id: `piq-${key}-${i + 1}-${hash(value)}`,
      prompt: template.prompt(value),
      guidance: { assesses: template.assesses, tips: PIQ_TIPS },
    }));
  });
}
