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
      <Link href="/student/resources" className="text-xs text-brand-accent hover:underline">
        ← Resources
      </Link>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.04em] text-ink-secondary uppercase">{resource.category}</p>
        <h1 className="text-[28px] font-bold text-ink">{resource.title}</h1>
      </div>
      <div className="glass-regular px-6 py-6 text-sm leading-relaxed text-ink">
        {resource.body}
      </div>
      <ResourceReadToggle slug={resource.slug} />
    </div>
  );
}
