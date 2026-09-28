import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Day2Hero } from "@/components/student/day2/day2-hero";
import { Day2Journey } from "@/components/student/day2/day2-journey";
import { Day2BeginnerPath } from "@/components/student/day2/day2-beginner-path";
import { Day2CategoryGrid } from "@/components/student/day2/day2-category-grid";
import { Day2RecentlyViewed } from "@/components/student/day2/day2-recently-viewed";
import { getDay2ResourceLibrary } from "@/lib/api/day2-resources";
import { DAY2_CATEGORY_SLUGS } from "@/lib/day2/categories";
import { getAvailableSections } from "@/lib/day2/sections";

export const metadata: Metadata = { title: "Day 2 Resources" };

// Orientation and navigation only — deliberately does not list a single
// individual resource. Pick a test below to see its resources on its own
// page (app/student/resources/day-2/[category]/page.tsx).
export default async function Day2ResourcesPage() {
  const result = await getDay2ResourceLibrary();
  const resources = result.data ?? [];

  const tatSections = getAvailableSections(resources.filter((r) => r.category === "tat"));
  const quickStartSection = tatSections.find((s) => s.key === "learn") ?? tatSections[0];
  const quickStartHref = `/student/resources/day-2/${DAY2_CATEGORY_SLUGS.tat}${quickStartSection ? `?do=${quickStartSection.key}` : ""}`;

  return (
    <div className="flex flex-col gap-8 pb-10">
      <Link
        href="/student/resources"
        className="inline-flex w-fit items-center gap-1 text-xs text-brand-accent hover:underline"
      >
        <ChevronLeft aria-hidden="true" size={14} />
        Resources
      </Link>

      {resources.length === 0 ? (
        <EmptyState title="No resources available yet" description="The Day 2 resource library will appear here." />
      ) : (
        <>
          <Day2Hero quickStartHref={quickStartHref} />
          <Day2Journey />
          <Day2BeginnerPath />
          <Day2CategoryGrid resources={resources} />
          <Day2RecentlyViewed />
        </>
      )}
    </div>
  );
}
