import type { Metadata } from "next";
import { ResourceDetailView } from "@/components/student/resources/views/resource-detail-view";
import { getResource } from "@/lib/api/resources";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResource(slug);
  return { title: result.data?.title ?? "Resource", description: result.data?.description };
}

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return ResourceDetailView({ audience: "academy", params });
}
