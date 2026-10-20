import type { Rubric } from "./types.js";

// Baseline rubric for a short written answer. Practice-specific rubrics
// (psychology T102, interview T103) are added alongside it.
export const GENERAL_RESPONSE_V1: Rubric = {
  id: "general-response",
  version: 1,
  title: "Written practice answer",
  context: "An SSB aspirant's written answer to a practice question on the platform.",
  dimensions: [
    { id: "relevance", name: "Relevance", looksFor: "Answers the question that was asked, without drifting." },
    { id: "structure", name: "Structure", looksFor: "A clear order: main point first, then support, then a close." },
    { id: "clarity", name: "Clarity", looksFor: "Plain, specific language a reader understands on first reading." },
    { id: "specificity", name: "Specificity", looksFor: "Concrete examples, actions or facts rather than general statements." },
  ],
  rules: [],
};
