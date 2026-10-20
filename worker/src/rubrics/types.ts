// A rubric is versioned and immutable once used: changing what a dimension
// means requires a new version, so every stored evaluation stays traceable to
// the rubric that produced it (PRD §11.7).

export interface RubricDimension {
  id: string;
  name: string;
  /** What the assessor looks for — observable behaviour in the answer, never a personality trait. */
  looksFor: string;
}

export interface Rubric {
  id: string;
  version: number;
  title: string;
  /** Who answered and in what setting, so the model judges against the right standard. */
  context: string;
  dimensions: RubricDimension[];
  /** Extra rules for this practice type, on top of the platform-wide safety rules. */
  rules: string[];
}
