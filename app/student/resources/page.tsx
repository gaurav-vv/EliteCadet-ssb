import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceReadBadge } from "@/components/student/resource-read-badge";
import { getResources } from "@/lib/api/resources";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage() {
  const result = await getResources();
  const resources = result.data ?? [];

  if (resources.length === 0) {
    return (
      <EmptyState
        title="No resources yet"
        description="Preparation guides and articles will appear here."
      />
    );
  }

  const categories = Array.from(new Set(resources.map((r) => r.category)));

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Resources</h1>
        <p className="text-sm text-ink-secondary">Guides to help you prepare beyond practice reps.</p>
      </div>

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
    </div>
  );
}
