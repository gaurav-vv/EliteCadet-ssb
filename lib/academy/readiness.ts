import type { DashboardIconTone } from "@/types/academy";

export interface ReadinessBand {
  label: string;
  tone: DashboardIconTone;
}

// One shared scale so every Academy page colours readiness the same way.
// Colour is always paired with the % value and this label (never colour-only).
export function readinessBand(value: number): ReadinessBand {
  if (value >= 80) return { label: "Excellent", tone: "success" };
  if (value >= 70) return { label: "Good", tone: "info" };
  if (value >= 65) return { label: "On track", tone: "indigo" };
  if (value >= 60) return { label: "Needs focus", tone: "warning" };
  return { label: "At risk", tone: "danger" };
}
