import { AcademyLayout } from "@/components/academy/layout/academy-layout";
import { getCurrentAcademyName, getCurrentUserAndProfile } from "@/lib/auth/session";
import { getMyUnreadCount } from "@/lib/server/notifications/service";

export default async function AcademyRouteLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, unreadCount] = await Promise.all([getCurrentUserAndProfile(), getMyUnreadCount()]);
  const academyName = (await getCurrentAcademyName(profile?.academyId ?? null)) || "Your academy";

  return (
    <AcademyLayout academyName={academyName} adminName={profile?.fullName || "Admin"} unreadCount={unreadCount}>
      {children}
    </AcademyLayout>
  );
}
