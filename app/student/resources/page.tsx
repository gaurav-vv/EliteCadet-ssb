import type { Metadata } from "next";
import { ResourcesHomeView } from "@/components/student/resources/views/resources-home-view";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage({ searchParams }: Pick<Parameters<typeof ResourcesHomeView>[0], "searchParams">) {
  return ResourcesHomeView({ audience: "student", searchParams });
}
