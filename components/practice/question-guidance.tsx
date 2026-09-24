import type { QuestionGuidance as Guidance } from "@/types/ssb-journey";

// Shared by the practice bank and the mock review screen, so a question's
// guidance reads the same wherever it's shown.
export function QuestionGuidance({ guidance }: { guidance: Guidance }) {
  return (
    <details className="glass-thin rounded-control px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-ink">What assessors look for</summary>
      <p className="mt-2 text-ink-secondary">{guidance.assesses}</p>
      <ul className="mt-2 flex flex-col gap-1 text-ink-secondary">
        {guidance.tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
