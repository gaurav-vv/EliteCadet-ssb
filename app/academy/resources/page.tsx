import type { Metadata } from "next";
import { ResourcesHomeView } from "@/components/student/resources/views/resources-home-view";

export const metadata: Metadata = { title: "Resources" };

// Academy admins see the same Resources as students, read-only: the platform admin is the only one who provides them.
export default async function ResourcesPage({ searchParams }: Pick<Parameters<typeof ResourcesHomeView>[0], "searchParams">) {
  return ResourcesHomeView({ audience: "academy", searchParams });
}
