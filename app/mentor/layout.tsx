import { MentorHeader } from "@/components/mentor/mentor-header";
import { MentorNav } from "@/components/mentor/mentor-nav";
import { getCurrentUserAndProfile } from "@/lib/auth/session";
import { markMentorActive } from "@/lib/mock/academy";

export default async function MentorLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  const mentorName = profile?.fullName || "Mentor";
  if (user) markMentorActive(user.id);

  return (
    <div className="flex min-h-full flex-col">
      <MentorHeader mentorName={mentorName} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row md:gap-6 md:px-6 md:py-6">
        <aside className="md:w-52 md:shrink-0">
          <MentorNav />
        </aside>
        <main className="flex flex-1 flex-col px-4 py-4 md:px-0 md:py-0">{children}</main>
      </div>
    </div>
  );
}
