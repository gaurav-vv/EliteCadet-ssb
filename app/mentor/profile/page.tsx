import type { Metadata } from "next";
import { MentorProfileForm } from "@/components/mentor/profile-form";
import { ErrorState } from "@/components/ui/error-state";
import { requireRole } from "@/lib/server/auth/guard";
import { getMyMentorProfile } from "@/lib/server/mentor/profile";

export const metadata: Metadata = { title: "Profile" };

export default async function MentorProfilePage() {
  await requireRole("mentor");
  const result = await getMyMentorProfile();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Profile</h1>
        <p className="text-sm text-ink-secondary">Update how you appear to your mentees.</p>
      </div>
      {result.ok && result.data ? (
        <MentorProfileForm initial={result.data} />
      ) : (
        <ErrorState message={result.error?.message ?? "We couldn't load your profile. Please try again."} />
      )}
    </div>
  );
}
