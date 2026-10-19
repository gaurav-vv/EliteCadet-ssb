import type { Rubric } from "./types.js";

// Feedback on a whole AI interview session (T103, PRD §11.1). Dimensions are
// about the answers as given, never about the student as a person.
export const INTERVIEW_V1: Rubric = {
  id: "interview",
  version: 1,
  title: "AI interview practice",
  context: "A text practice interview: an AI interviewer asked an opening question and then follow-ups based on the student's own answers. Each item is one question and the student's written answer.",
  dimensions: [
    { id: "relevance", name: "Answers the question", looksFor: "Each answer addresses what was actually asked, including in follow-ups." },
    { id: "specificity", name: "Specific examples", looksFor: "Answers back statements with concrete examples, actions, names, numbers or outcomes." },
    { id: "structure", name: "Structure", looksFor: "Answers lead with the point, then support it, and stay brief." },
    { id: "consistency", name: "Consistency", looksFor: "Answers fit together across the interview, with no contradictions between them." },
    { id: "reflection", name: "Reflection", looksFor: "When asked about mistakes or weaker areas, answers name them honestly together with what is being done about them." },
  ],
  rules: [
    "Judge the content of the written answers, not grammar or English fluency.",
    "Blank answers are unanswered questions: note them without guessing why.",
    "Never suggest memorised 'model answers'; encourage authentic, specific ones.",
  ],
};
