import { StatusBadge } from "@/components/academy/shared/status-badge";

// Shown on any panel whose data is a placeholder (AcademyAnalytics.source ===
// "demo") so mock values are never mistaken for the academy's real numbers.
export function DemoBadge() {
  return <StatusBadge label="Demo data" tone="neutral" />;
}
