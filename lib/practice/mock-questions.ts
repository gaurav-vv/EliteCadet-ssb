import type { MockSessionConfig } from "@/lib/practice/config";
import type { GuidedPracticeItem } from "@/types/ssb-journey";

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks one mock run's questions: the opening question first (if configured
 * and present), then up to `maxPiqQuestions` from the student's PIQ, then
 * general questions, all in random order, never more than `questionCount`
 * and never a repeat. `random` is injectable so tests are deterministic.
 */
export function pickMockQuestions(
  config: MockSessionConfig,
  general: GuidedPracticeItem[],
  piq: GuidedPracticeItem[] = [],
  random: () => number = Math.random,
): GuidedPracticeItem[] {
  const opening = general.find((q) => q.id === config.openingQuestionId);
  const rest = general.filter((q) => q !== opening);
  const fromPiq = shuffle(piq, random).slice(0, config.maxPiqQuestions);
  const picked = [...(opening ? [opening] : []), ...fromPiq, ...shuffle(rest, random)];
  return picked.slice(0, config.questionCount);
}
