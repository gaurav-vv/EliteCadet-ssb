// Normalised defence/SSB news item (Student dashboard + in-app reader at
// /student/news/[id]). Every field comes from the official source — nothing
// is generated.
export type NewsCategory =
  | "Official Update"
  | "Exam Update"
  | "Defence News"
  | "Current Affairs"
  | "SSB Preparation"
  | "Article";

export interface NewsArticle {
  /** Stable id for the in-app reader (hash of the source URL). */
  id: string;
  title: string;
  url: string;
  /** ISO date (YYYY-MM-DD) as published by the source; null when the source shows none. */
  date: string | null;
  source: string;
  category: NewsCategory;
  /** Only when the source provides one; null otherwise. */
  summary: string | null;
  /** The source's own opening paragraphs (plain text, capped), for the reader. */
  excerpt: string[] | null;
  /** Language of the item as published. */
  lang: "en" | "hi";
  /** Only a real image from the source; null → UI shows a neutral fallback. */
  image: string | null;
}
