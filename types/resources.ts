// Student Resources library (/student/resources). Editorial content written
// for EliteCadet — every article is authored in lib/content/resources/*, never
// fetched or generated at request time.

export const RESOURCE_CATEGORIES = [
  "Psychology Tests",
  "Interview Preparation",
  "Group Tasks",
  "Current Affairs",
  "Exam Guidance",
  "Tips & Strategies",
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

// A real photograph for an article (lib/content/resources/photos.ts), with
// the attribution its licence requires.
export interface ResourcePhoto {
  /** Local file under public/images/resources/. */
  src: string;
  alt: string;
  author: string;
  /** e.g. "CC BY-SA 4.0", "Public domain", "GODL-India". */
  license: string;
  licenseUrl: string | null;
  /** The file's page on Wikimedia Commons. */
  sourceUrl: string;
}

export interface ResourceSection {
  /** Anchor id for the table of contents (kebab-case, unique within the article). */
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  /** A worked example: a short label plus the example text. */
  example?: { label: string; text: string };
}

export interface ResourceExercise {
  title: string;
  instructions: string;
}

export interface ResourceSummary {
  slug: string;
  title: string;
  category: ResourceCategory;
  description: string;
  /** Estimated minutes to read, from the article's word count. */
  readingMinutes: number;
  /** ISO date the article was last written or revised for EliteCadet. */
  updatedOn: string;
  photo: ResourcePhoto;
  featured?: boolean;
}

export interface ResourceDetail extends ResourceSummary {
  objectives: string[];
  sections: ResourceSection[];
  exercises: ResourceExercise[];
  takeaways: string[];
  /** Official pages the article relies on (exam notifications etc.). */
  officialLinks?: { label: string; url: string }[];
}

/** What a content file authors; readingMinutes is computed from the text and
 *  the photo comes from lib/content/resources/photos.ts. */
export type ResourceArticle = Omit<ResourceDetail, "readingMinutes" | "photo">;

// Printable study material served as a real PDF (/student/resources/downloads).
export interface PrintableBlock {
  heading: string;
  lines: string[];
  /** "check" draws a tick box per line; "write" adds ruled answer lines after each. */
  style?: "text" | "check" | "write";
}

export interface PrintableDoc {
  slug: string;
  title: string;
  kind: "Checklist" | "Worksheet" | "Study plan" | "Revision notes";
  category: ResourceCategory;
  description: string;
  blocks: PrintableBlock[];
}

// Curated YouTube videos (/student/resources/videos). Every id, title and
// channel was checked against YouTube's oEmbed endpoint (public + embeddable).
export interface ResourceVideo {
  youtubeId: string;
  title: string;
  channel: string;
  /** Length as listed on YouTube, e.g. "8:56". */
  duration: string;
  category: ResourceCategory;
  /** Why it's useful — written by EliteCadet, from the video's own title/topic. */
  note: string;
  /** Library article to read alongside it. */
  relatedSlug?: string;
}

// Recommended Reading (/student/resources/reading).
export interface ReadingItem {
  title: string;
  /** Author or publisher, as commonly cited. */
  by: string;
  kind: "Book" | "Official source" | "Free textbook";
  group: "Officer qualities & military history" | "Written exam (NDA/CDS)" | "English & communication" | "Official sources";
  why: string;
  /** Official or free online location; omitted for books (buy or borrow anywhere). */
  url?: string;
}
