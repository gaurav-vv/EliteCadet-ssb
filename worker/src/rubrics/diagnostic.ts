import type { Rubric } from "./types.js";

// The starting-point diagnostic's written part (T105, PRD §9.3). It sets an
// entry point, never a label: feedback must read as "where to start".
export const DIAGNOSTIC_V1: Rubric = {
  id: "diagnostic",
  version: 1,
  title: "Starting-point diagnostic",
  context: "A short, low-pressure diagnostic taken when the student starts (or retakes it later): one answer about motivation, two everyday situations, and one about their own strengths and areas to improve.",
  dimensions: [
    { id: "communication", name: "Communication", looksFor: "The motivation answer makes a clear point and supports it with something specific." },
    { id: "situational_reasoning", name: "Situational reasoning", looksFor: "The situation answers describe practical, responsible steps that deal with the whole situation." },
    { id: "self_awareness", name: "Self-awareness", looksFor: "The self answer names a real strength and a real area to improve, each with an example." },
  ],
  rules: [
    "This is a starting point, not a grade: frame every point as where to begin, and keep the tone encouraging.",
    "Short answers are expected; judge what is there, and note what is missing without guessing why.",
  ],
};
