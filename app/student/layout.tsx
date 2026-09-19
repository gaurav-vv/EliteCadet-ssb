import { StudentHeader } from "@/components/student/student-header";
import { StudentNav } from "@/components/student/student-nav";
import { getCurrentUserAndProfile } from "@/lib/auth/session";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  const studentName = profile?.fullName || "Student";

  return (
    <div className="flex min-h-full flex-col">
      <StudentHeader studentName={studentName} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row md:gap-6 md:px-6 md:py-6">
        <aside className="md:w-52 md:shrink-0">
          <StudentNav />
        </aside>
        <main className="flex flex-1 flex-col px-4 py-4 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}
