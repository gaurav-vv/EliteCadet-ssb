// Student preparation preferences (T105, PRD §9.1–9.2, FR-ONB-01): saved to
// the account, editable any time. The stage here is self-reported and is
// kept separate from the roadmap's observed stage (PRD §5.4).

export type PreparationStage = "just_starting" | "in_progress" | "final_stretch";
export type EntryScheme = "nda" | "cds" | "afcat" | "tes" | "tgc" | "ssc" | "ncc" | "other";
export type PreferredLanguage = "en" | "hi";

export const ENTRY_SCHEMES: Record<EntryScheme, string> = {
  nda: "NDA",
  cds: "CDS",
  afcat: "AFCAT",
  tes: "TES (10+2 Technical Entry)",
  tgc: "TGC (Technical Graduate Course)",
  ssc: "SSC (Short Service Commission)",
  ncc: "NCC Special Entry",
  other: "Other",
};

export const PREPARATION_STAGES: Record<PreparationStage, string> = {
  just_starting: "Just starting",
  in_progress: "Preparing for a while",
  final_stretch: "Final stretch",
};

export const STUDY_MINUTES = [15, 30, 45, 60, 90, 120] as const;

export interface StudentPreferences {
  fullName: string;
  entryScheme: EntryScheme | null;
  targetSsbDate: string | null;
  preparationStage: PreparationStage | null;
  preferredLanguage: PreferredLanguage;
  dailyStudyMinutes: number | null;
  goals: string;
  onboarded: boolean;
}

export type PreferencesInput = Omit<StudentPreferences, "onboarded">;
