import type { Rubric } from "./types.js";

// Psychology practice rubrics (T102, PRD §11.2). Every dimension describes
// something observable in the written responses. The output is "observed
// practice patterns" — never a statement about the student's personality or
// mind (a hard safety rule, enforced again by the guardrails).

const PSYCHOLOGY_RULES = [
  "Describe patterns in the responses (for example, 'most stories end with the character acting to solve the problem'), never what they reveal about the student as a person.",
  "Do not use psychological, clinical or personality vocabulary about the student, and do not infer traits, emotions or mental states.",
  "Treat unanswered items as unanswered: note them, but do not guess why they were left blank.",
  "Look at the set as a whole: a pattern across several responses matters more than one response.",
];

export const PSYCHOLOGY_TAT_V1: Rubric = {
  id: "psychology-tat",
  version: 1,
  title: "TAT practice (Thematic Apperception Test)",
  context: "Timed practice: for each picture (described in text) the student wrote a short story in about four minutes; the last item is a blank picture where the student imagines their own scene.",
  dimensions: [
    { id: "perception", name: "Fit to the picture", looksFor: "Stories use what the picture shows rather than ignoring it." },
    { id: "central_character", name: "Central character and goal", looksFor: "Each story has a clear main character with a clear aim." },
    { id: "action", name: "Action toward the goal", looksFor: "The character takes concrete, practical steps, not just wishes or feelings." },
    { id: "outcome", name: "Realistic resolution", looksFor: "Stories reach a realistic, constructive ending that follows from the actions." },
    { id: "structure", name: "Story structure", looksFor: "What led up to the scene, what is happening, and how it ends are all present and in order." },
  ],
  rules: PSYCHOLOGY_RULES,
};

export const PSYCHOLOGY_WAT_V1: Rubric = {
  id: "psychology-wat",
  version: 1,
  title: "WAT practice (Word Association Test)",
  context: "Timed practice: for each word the student had about 15 seconds to write one sentence.",
  dimensions: [
    { id: "constructive", name: "Constructive framing", looksFor: "Sentences frame the word in a constructive or solution-oriented way, including for difficult words." },
    { id: "action", name: "Action and practicality", looksFor: "Sentences describe what someone does or can do, rather than abstract statements or definitions." },
    { id: "completeness", name: "Completeness", looksFor: "Items are answered with complete, meaningful sentences rather than fragments or blanks." },
    { id: "variety", name: "Variety", looksFor: "Sentences are varied rather than repeating the same structure or idea for many words." },
  ],
  rules: [...PSYCHOLOGY_RULES, "Do not reward slogans or memorised 'model' sentences over genuine, specific ones."],
};

export const PSYCHOLOGY_SRT_V1: Rubric = {
  id: "psychology-srt",
  version: 1,
  title: "SRT practice (Situation Reaction Test)",
  context: "Timed practice: the student wrote what they would do in each everyday situation, with one shared time limit for all of them.",
  dimensions: [
    { id: "practicality", name: "Practical action", looksFor: "Reactions say what would actually be done, in steps that would work in the situation." },
    { id: "completeness", name: "Addresses the whole situation", looksFor: "Reactions deal with every part of the situation, not just the first part." },
    { id: "initiative", name: "Initiative", looksFor: "Reactions take the first step themselves instead of waiting for others or giving up." },
    { id: "others", name: "Consideration for others", looksFor: "Reactions take account of the other people affected in the situation." },
    { id: "coverage", name: "Coverage", looksFor: "Most situations are attempted within the time, with reactions that stay brief and to the point." },
  ],
  rules: PSYCHOLOGY_RULES,
};

export const PSYCHOLOGY_SDT_V1: Rubric = {
  id: "psychology-sdt",
  version: 1,
  title: "SD practice (Self Description Test)",
  context: "Timed practice: the student described how five different people (for example parents, teachers, friends, themselves) see them.",
  dimensions: [
    { id: "specificity", name: "Specific examples", looksFor: "Descriptions give specific behaviours or examples rather than lists of adjectives." },
    { id: "balance", name: "Balance", looksFor: "Each perspective includes both what is going well and what the student is working on." },
    { id: "consistency", name: "Consistency across perspectives", looksFor: "The five descriptions fit together rather than contradicting each other." },
    { id: "growth", name: "Improvement focus", looksFor: "Areas to improve come with what the student is doing about them." },
  ],
  rules: [...PSYCHOLOGY_RULES, "These are the student's own descriptions of how others see them; comment on how the descriptions are written, never on whether they are true."],
};

export const PSYCHOLOGY_RUBRICS = [PSYCHOLOGY_TAT_V1, PSYCHOLOGY_WAT_V1, PSYCHOLOGY_SRT_V1, PSYCHOLOGY_SDT_V1];
