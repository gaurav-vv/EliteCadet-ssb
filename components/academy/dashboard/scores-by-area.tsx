import { Shapes } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { CategoryBars } from "@/components/progress/progress-views";
import { EmptyState } from "@/components/ui/empty-state";
import type { CategoryAverage } from "@/types/progress";

// Academy-wide average of mentor-reviewed scores per area — a preparation
// overview, never a psychological assessment of any student.
export function ScoresByArea({ categories }: { categories: CategoryAverage[] }) {
  return (
    <ChartCard title="Scores by Area" action={{ label: "Performance", href: "/academy/performance" }}>
      {categories.length === 0 ? (
        <EmptyState icon={<Shapes aria-hidden="true" size={22} />} title="No reviewed scores yet" description="Averages appear once mentors review assessments." />
      ) : (
        <CategoryBars categories={categories} />
      )}
    </ChartCard>
  );
}
