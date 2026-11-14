import type { Metadata } from "next";
import { ResourceCategoryView } from "@/components/student/resources/views/resource-category-view";
import { categoryFromSlug } from "@/lib/api/resources";

type Props = { params: Promise<{ category: string }>; searchParams: Promise<{ q?: string; page?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = categoryFromSlug((await params).category);
  return { title: category ? `${category} · Resources` : "Resources" };
}

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default async function ResourceCategoryPage({ params, searchParams }: Props) {
  return ResourceCategoryView({ audience: "academy", params, searchParams });
}
