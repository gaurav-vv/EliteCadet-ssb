import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceReadToggle } from "@/components/student/resource-read-toggle";
import { getResource } from "@/lib/api/resources";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getResource(slug);
  return { title: result.data?.title ?? "Resource" };
}

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getResource(slug);

  if (!result.ok || !result.data) {
    notFound();
  }

  const resource = result.data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 pb-10">
      <Link href="/student/resources" className="text-xs text-brand-navy hover:underline">
        ← Resources
      </Link>
      <div>
        <p className="text-xs font-medium tracking-wide text-text-muted uppercase">{resource.category}</p>
        <h1 className="text-2xl font-semibold text-text-primary">{resource.title}</h1>
      </div>
      <div className="glass-surface px-6 py-6 text-sm leading-relaxed text-text-primary">
        {resource.body}
      </div>
      <ResourceReadToggle slug={resource.slug} />
    </div>
  );
}
