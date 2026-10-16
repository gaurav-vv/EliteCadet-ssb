// Student onboarding types. Dashboard data lives in types/dashboards.ts.

export type PreparationStage = "just_starting" | "in_progress" | "final_stretch";

export type TargetExam = "cds" | "afcat" | "nda" | "ssc" | "other";

export interface OnboardingInput {
  fullName: string;
  targetExam: TargetExam;
  preparationStage: PreparationStage;
  academyName: string | null;
  goals: string;
}
