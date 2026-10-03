import { AcademyLayout } from "@/components/academy/layout/academy-layout";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";

export default async function AcademyRouteLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  const academyName = (await getCurrentAcademyName(profile?.academyId ?? null)) || "Your academy";

  return (
    <AcademyLayout academyName={academyName} adminName={profile?.fullName || "Admin"}>
      {children}
    </AcademyLayout>
  );
}
