// Mentor profile contract (mentor_profiles, 0005 + profiles.full_name).

export interface MentorProfile {
  fullName: string;
  bio: string;
  expertise: string[];
}

export interface MentorProfileInput {
  fullName: string;
  bio: string;
  /** Comma-separated, as typed in the form. */
  expertise: string;
}

export type MentorProfileErrors = Partial<Record<keyof MentorProfileInput, string>>;

export const MENTOR_BIO_MAX = 600;
export const MENTOR_EXPERTISE_MAX_ITEMS = 8;
export const MENTOR_EXPERTISE_ITEM_MAX = 40;
