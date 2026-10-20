export type DemoInterest = "student" | "mentor" | "academy";

export const DEMO_INTEREST_LABELS: Record<DemoInterest, string> = {
  student: "I'm preparing for the SSB",
  mentor: "I want to mentor aspirants",
  academy: "I run an academy or institution",
};

export interface DemoRequestInput {
  fullName: string;
  email: string;
  phone: string;
  organisation: string;
  interest: DemoInterest;
  message: string;
}
