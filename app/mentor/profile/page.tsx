import type { Metadata } from "next";
import { RetryErrorState } from "@/components/academy/shared/retry-error-state";
import { MentorProfileForm } from "@/components/mentor/profile-form";
import { getMyMentorProfile } from "@/lib/server/mentor-profile/service";

export const metadata: Metadata = { title: "Profile" };

export default async function MentorProfilePage() {
  const result = await getMyMentorProfile();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 pb-10">
      <div>
        <h1 className="text-[28px] font-bold text-ink">Profile</h1>
        <p className="text-sm text-ink-secondary">Update how you appear to your mentees.</p>
      </div>
      {!result.ok || !result.data ? (
        <RetryErrorState message={result.error?.message ?? "We couldn't load your profile. Please try again."} />
      ) : (
        <MentorProfileForm
          initial={{
            fullName: result.data.fullName,
            phone: result.data.phone ?? "",
            specialization: result.data.specialization.join(", "),
            qualifications: result.data.qualifications ?? "",
            bio: result.data.bio ?? "",
          }}
        />
      )}
    </div>
  );
}
