"use client";

import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { Radar as RadarIcon } from "lucide-react";
import { ChartCard } from "@/components/academy/shared/chart-card";
import { DemoBadge } from "@/components/academy/shared/demo-badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsSource, AssessmentInsight } from "@/types/academy";

interface AssessmentRadarProps {
  data: AssessmentInsight[];
  source: AnalyticsSource;
}

// Aggregated skill scores for the whole academy against a target benchmark —
// a preparation overview, not a psychological assessment of any student.
export function AssessmentRadar({ data, source }: AssessmentRadarProps) {
  return (
    <ChartCard title="Assessment Strengths vs Weaknesses" badge={source === "demo" ? <DemoBadge /> : undefined}>
      {data.length === 0 ? (
        <EmptyState
          icon={<RadarIcon aria-hidden="true" size={22} />}
          title="No assessment data yet"
          description="Skill averages appear once evaluations are submitted."
        />
      ) : (
        <div
          role="img"
          aria-label={`Academy skill averages against benchmark: ${data.map((d) => `${d.skill} ${d.academyAverage} of ${d.benchmark}`).join(", ")}`}
          className="h-80 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="58%" margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="var(--hairline)" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: "var(--ink-secondary)", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid var(--hairline)", boxShadow: "var(--shadow-md)", fontSize: 13 }}
              />
              <Radar
                name="Academy Average"
                dataKey="academyAverage"
                stroke="var(--brand-accent)"
                fill="var(--brand-accent)"
                fillOpacity={0.22}
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Radar
                name="Target SSB Benchmark"
                dataKey="benchmark"
                stroke="var(--academy-gold)"
                fill="none"
                strokeWidth={2}
                strokeDasharray="5 4"
                isAnimationActive={false}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
