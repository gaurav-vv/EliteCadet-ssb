import type { Evaluation } from "./schema.js";

// Output checks run on every evaluation before it is stored (PRD §5.4, §12.11).
// A failure means the evaluation is discarded and the job retried, never shown.

export type GuardrailViolation =
  | { kind: "banned_claim"; rule: string; field: string }
  | { kind: "ungrounded_evidence"; dimension: string; quote: string };

const BANNED: { rule: string; pattern: RegExp }[] = [
  { rule: "selection_prediction", pattern: /\b(you|candidate|student|he|she|they)\b[^.]{0,40}\b(will|would|are going to|is going to|are likely to|is likely to)\b[^.]{0,20}\b(be\s+)?(selected|recommended|rejected|screened out|pass|fail|clear|crack)\b/i },
  { rule: "selection_prediction", pattern: /\b(guarantee[sd]?|assure[sd]?)\b[^.]{0,30}\b(selection|recommendation|success)\b/i },
  { rule: "official_score", pattern: /\bofficial\s+(ssb\s+)?(score|result|rating|grade|marks?)\b/i },
  { rule: "single_readiness_number", pattern: /\b(readiness|ssb\s+score|olq\s+score|overall\s+score)\b[^.]{0,20}\b\d{1,3}\s*(%|percent|\/\s*100)/i },
  { rule: "clinical_claim", pattern: /\b(depress(ed|ion)|anxiety\s+disorder|personality\s+disorder|bipolar|adhd|ocd|ptsd|narcissis\w*|psychopath\w*|sociopath\w*|mentally\s+ill|mental\s+illness|diagnos\w*|clinical(ly)?|neurotic|introvert(ed)?\s+personality)\b/i },
  { rule: "accent", pattern: /\baccent(s|ed)?\b/i },
];

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[“”"'‘’`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export function checkEvaluation(evaluation: Evaluation, studentText: string): GuardrailViolation[] {
  const violations: GuardrailViolation[] = [];
  const fields: [string, string][] = [
    ...evaluation.dimensions.flatMap((d, i): [string, string][] => [[`dimensions[${i}].note`, d.note], ...d.evidence.map((e, j): [string, string] => [`dimensions[${i}].evidence[${j}]`, e])]),
    ...Object.entries(evaluation.feedback).map(([k, v]): [string, string] => [`feedback.${k}`, v]),
  ];
  for (const [field, value] of fields) {
    for (const { rule, pattern } of BANNED) {
      // A quote of the student's own words may contain anything; only our text is checked.
      if (field.includes(".evidence[")) continue;
      if (pattern.test(value)) violations.push({ kind: "banned_claim", rule, field });
    }
  }
  const haystack = normalize(studentText);
  for (const d of evaluation.dimensions) {
    for (const quote of d.evidence) {
      const q = normalize(quote.replace(/^\.{3}|\.{3}$|…/g, ""));
      if (q.length === 0 || !haystack.includes(q)) violations.push({ kind: "ungrounded_evidence", dimension: d.dimension, quote });
    }
  }
  return violations;
}
