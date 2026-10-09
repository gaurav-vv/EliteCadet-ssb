// Normalised defence/SSB news item (Student dashboard). Every field comes from
// the official source page — nothing is generated.
export type NewsCategory =
  | "Official Update"
  | "Exam Update"
  | "Defence News"
  | "SSB Preparation"
  | "Article";

export interface NewsArticle {
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD) as published by the source; null when the source shows none. */
  date: string | null;
  source: string;
  category: NewsCategory;
  /** Only when the source provides one; null otherwise. */
  summary: string | null;
  /** Only a real image from the source; null → UI shows a neutral fallback. */
  image: string | null;
}
