import { Layers } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DataTable } from "@/components/academy/shared/data-table";
import { ProgressBar } from "@/components/academy/shared/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import type { DashboardIconTone } from "@/types/academy";
import type { AcademyDashboard } from "@/types/dashboards";

// Score bands for the bar; colour is always paired with the % and this label.
function scoreBand(value: number): { label: string; tone: DashboardIconTone } {
  if (value >= 80) return { label: "Strong", tone: "success" };
  if (value >= 65) return { label: "Good", tone: "info" };
  if (value >= 50) return { label: "Fair", tone: "warning" };
  return { label: "Low", tone: "danger" };
}

// Identity colours for batch badges — like avatar colours, they only help the
// eye tell rows apart; performance is carried by the bar colour + % + label.
const BADGE_TONES: DashboardIconTone[] = ["indigo", "success", "info", "warning", "danger"];

function batchInitials(name: string): string {
  const words = name.replace(/^batch\s+/i, "").trim().split(/\s+/).filter(Boolean);
  return (words[0]?.slice(0, 2) ?? "B").toUpperCase();
}

export function BatchPerformance({ batches }: { batches: AcademyDashboard["batches"] }) {
  const toneById = new Map(batches.map((b, i) => [b.batchId, BADGE_TONES[i % BADGE_TONES.length]]));

  return (
    <ChartCard title="Batch Performance" action={{ label: "View All", href: "/academy/batches" }} className="md:col-span-2 xl:col-span-1">
      {batches.length === 0 ? (
        <EmptyState
          icon={<Layers aria-hidden="true" size={22} />}
          title="No batches yet"
          description="Create a batch to start tracking performance."
        />
      ) : (
        <DataTable
          caption="Batch performance"
          rows={batches}
          getRowKey={(b) => b.batchId}
          getRowHref={(b) => `/academy/batches/${b.batchId}`}
          columns={[
            {
              key: "name",
              header: "Batch",
              cell: (b) => (
                <span className="inline-flex items-center gap-2.5 whitespace-nowrap">
                  <span
                    aria-hidden="true"
                    data-tone={toneById.get(b.batchId)}
                    className="academy-tint flex size-8 shrink-0 items-center justify-center rounded-control text-[11px] font-bold"
                  >
                    {batchInitials(b.name)}
                  </span>
                  {b.name}
                </span>
              ),
            },
            { key: "students", header: "Students", cell: (b) => b.studentCount },
            {
              key: "score",
              header: "Avg Score",
              cell: (b) => {
                if (b.avgScorePct === null) return <ProgressBar value={null} label={`${b.name} average score`} emptyLabel="No reviews yet" />;
                const band = scoreBand(b.avgScorePct);
                return <ProgressBar value={b.avgScorePct} tone={band.tone} statusLabel={band.label} label={`${b.name} average score`} />;
              },
            },
          ]}
        />
      )}
    </ChartCard>
  );
}
