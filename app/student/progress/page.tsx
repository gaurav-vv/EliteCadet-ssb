import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { getProgressData } from "@/lib/api/progress";

export const metadata: Metadata = { title: "Progress" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const variant = preview === "active" ? "active" : "empty";
  const result = await getProgressData(variant);
  const data = result.data!;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">My Progress</h1>
        <p className="text-sm text-text-muted">
          Your readiness, skill-area performance and history, based only on what you&apos;ve actually
          practised.
        </p>
      </div>

      <section className="glass-surface flex flex-col gap-1 px-5 py-4">
        <span className="text-xs font-medium tracking-wide text-text-muted uppercase">
          Overall readiness
        </span>
        {data.readiness ? (
          <>
            <span className="text-3xl font-semibold text-text-primary">
              {data.readiness.score}
              <span className="text-base font-normal text-text-muted">/100</span>
            </span>
            <span className="text-xs text-text-muted">{data.readiness.basis}</span>
          </>
        ) : (
          <span className="text-sm text-text-muted">
            Not enough data yet — complete a few practices to get your first reading.
          </span>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Trend</h2>
        {data.trend ? (
          <div className="glass-surface flex items-end gap-3 px-5 py-4">
            {data.trend.map((point) => (
              <div key={point.label} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 rounded-t-sm bg-brand-navy-300"
                  style={{ height: `${Math.max(point.value, 4)}px` }}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-text-muted">{point.label}</span>
              </div>
            ))}
            <span className="sr-only">
              {data.trend.map((p) => `${p.label}: ${p.value}`).join(", ")}
            </span>
          </div>
        ) : (
          <EmptyState title="Not enough data yet" description="A trend needs at least a few weeks of activity." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Skill-area performance</h2>
        {data.skillAreas.length > 0 ? (
          <div className="flex flex-col gap-2">
            {data.skillAreas.map((skill) => (
              <div key={skill.skillArea} className="glass-surface flex items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{skill.skillArea}</p>
                  <p className="text-xs text-text-muted">{skill.basis}</p>
                </div>
                <span className="text-lg font-semibold text-text-primary">{skill.score}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No skill data yet" description="Complete a practice in each test to see it here." />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Improvement areas</h2>
        {data.improvementAreas.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.improvementAreas.map((area) => (
              <li key={area.title} className="glass-surface flex flex-col gap-1 px-5 py-3">
                <p className="text-sm font-medium text-text-primary">{area.title}</p>
                <p className="text-xs text-text-muted">{area.reason}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No improvement areas yet"
            description="These appear once we can see a real pattern in your responses."
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-text-muted">Activity history</h2>
        {data.activityHistory.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {data.activityHistory.map((item) => (
              <li key={item.id} className="glass-surface flex items-center justify-between px-5 py-3">
                <span className="text-sm text-text-primary">{item.title}</span>
                <span className="text-xs text-text-muted">
                  {item.category} · {formatDate(item.completedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No activity yet" description="Your completed practices will show up here." />
        )}
      </section>
    </div>
  );
}
