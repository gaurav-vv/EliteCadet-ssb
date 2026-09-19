import { AcademyHeader } from "@/components/academy/academy-header";
import { AcademyNav } from "@/components/academy/academy-nav";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  const adminName = profile?.fullName || "Admin";

  return (
    <div className="flex min-h-full flex-col">
      <AcademyHeader adminName={adminName} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row md:gap-6 md:px-6 md:py-6">
        <aside className="md:w-52 md:shrink-0">
          <AcademyNav />
        </aside>
        <main className="flex flex-1 flex-col px-4 py-4 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}
