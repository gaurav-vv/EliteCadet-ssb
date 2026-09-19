"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  readStoredMentorProfile,
  writeStoredMentorProfile,
  type MentorProfileInput,
} from "@/lib/mentor/profile-storage";
import { updateFullName } from "@/lib/auth/update-profile";

interface MentorProfileFormProps {
  realFullName: string;
}

function loadInitial(realFullName: string): MentorProfileInput {
  const stored = readStoredMentorProfile();
  return {
    fullName: realFullName,
    specialization: stored?.specialization ?? "Psychology tests (TAT, WAT, SRT, SDT)",
    bio: stored?.bio ?? "SSB mentor focused on structured, response-specific feedback.",
  };
}

export function MentorProfileForm({ realFullName }: MentorProfileFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<MentorProfileInput>(() => loadInitial(realFullName));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const nameResult = await updateFullName(values.fullName);
    if (!nameResult.ok) {
      setFieldError(nameResult.message ?? "Something went wrong.");
      setStatus("error");
      return;
    }

    setFieldError(null);
    writeStoredMentorProfile(values);
    setStatus("saved");
    router.refresh();
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8">
      {status === "saved" && (
        <Alert>
          <AlertDescription>Your profile was updated.</AlertDescription>
        </Alert>
      )}
      {status === "error" && (
        <Alert variant="destructive">
          <AlertDescription>{fieldError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            value={values.fullName}
            onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={values.specialization}
            onChange={(e) => setValues((v) => ({ ...v, specialization: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={values.bio}
            onChange={(e) => setValues((v) => ({ ...v, bio: e.target.value }))}
          />
        </div>
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
