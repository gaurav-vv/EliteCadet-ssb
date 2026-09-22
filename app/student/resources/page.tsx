import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceReadBadge } from "@/components/student/resource-read-badge";
import { Day2Visual } from "@/components/student/day2/day2-visual";
import { DAY2_CATEGORY_ACCENT } from "@/lib/day2/categories";
import { getResources } from "@/lib/api/resources";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const result = await getResources();
  const resources = result.data ?? [];

  const categories = Array.from(new Set(resources.map((r) => r.category)));

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Resources</h1>
        <p className="text-sm text-ink-secondary">Guides to help you prepare beyond practice reps.</p>
      </div>

      <Link
        href="/student/resources/day-2"
        className="day2-cat-wash day2-cat-hover glass-regular glass-hover-lift group flex items-center gap-5 rounded-card border border-transparent px-6 py-6 no-underline"
        style={{ "--cat-accent": DAY2_CATEGORY_ACCENT["full-day-2"] } as React.CSSProperties}
      >
        <Day2Visual category="full-day-2" size="lg" className="day2-cat-icon transition-transform duration-300 group-hover:scale-105" />
        <span className="flex-1 text-[22px] font-bold text-ink">Day 2</span>
        <span className="day2-cat-icon inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold">
          Explore Day 2
          <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </Link>

      {resources.length === 0 ? (
        <EmptyState
          title="No other resources yet"
          description="Preparation guides and articles will appear here."
        />
      ) : (
        <>
          {categories.map((category) => (
            <section key={category} className="flex flex-col gap-3">
              <h2 className="text-[18px] font-semibold text-ink">{category}</h2>
              <ul className="flex flex-col gap-2">
                {resources
                  .filter((r) => r.category === category)
                  .map((resource) => (
                    <li key={resource.slug}>
                      <Link
                        href={`/student/resources/${resource.slug}`}
                        className="glass-regular flex flex-col gap-1 px-5 py-3 no-underline hover:-translate-y-0.5 hover:scale-[1.01]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-ink">{resource.title}</span>
                          <ResourceReadBadge slug={resource.slug} />
                        </div>
                        <span className="text-xs text-ink-secondary">{resource.description}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
