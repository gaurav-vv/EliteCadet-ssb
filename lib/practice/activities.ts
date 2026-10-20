// The four Psychology tests' descriptions (T032). Copy only: the items come
// from the matching practice bank (slug = test type), and the item count
// shown to the student is always the bank's real count.

import type { PsychologyTestType } from "@/types/practice";

export interface PsychologyActivity {
  testType: PsychologyTestType;
  title: string;
  description: string;
  durationLabel: string;
}

export const PSYCHOLOGY_ACTIVITIES: PsychologyActivity[] = [
  { testType: "tat", title: "TAT — Thematic Apperception Test", description: "Write a short story for each scene, then one final story of your own choosing.", durationLabel: "30s view + 4 min write, per picture" },
  { testType: "wat", title: "WAT — Word Association Test", description: "Write the first sentence that comes to mind for each word.", durationLabel: "15s per word" },
  { testType: "srt", title: "SRT — Situation Reaction Test", description: "React to each everyday situation with what you would actually do.", durationLabel: "30 minutes total" },
  { testType: "sdt", title: "SDT — Self Description Test", description: "Describe yourself from five different points of view.", durationLabel: "15 minutes total" },
];

export function isPsychologyTest(value: string): value is PsychologyTestType {
  return PSYCHOLOGY_ACTIVITIES.some((a) => a.testType === value);
}
