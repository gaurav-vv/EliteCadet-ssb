"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveMentorProfileAction } from "@/lib/actions/mentor-profile";
import type { MentorProfileField } from "@/lib/server/mentor-profile/validation";

export interface MentorProfileFormValues {
  fullName: string;
  phone: string;
  specialization: string;
  qualifications: string;
  bio: string;
}

const FIELD_IDS: Record<MentorProfileField, string> = {
  fullName: "fullName",
  phone: "phone",
  specialization: "specialization",
  qualifications: "qualifications",
  bio: "bio",
};

// Saved to the database (profiles + mentor_profiles) for both academy and independent mentors.
export function MentorProfileForm({ initial }: { initial: MentorProfileFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<MentorProfileFormValues>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [field, setField] = useState<MentorProfileField | null>(null);
  // A ref, not state: a second click in the same tick must not submit twice.
  const submitting = useRef(false);

  const set = (key: keyof MentorProfileFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (field === key) setField(null);
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setStatus("saving");
    setMessage(null);
    setField(null);
    try {
      const result = await saveMentorProfileAction(values);
      if (!result.ok) {
        setMessage(result.error?.message ?? "We couldn't save your profile. Please try again.");
        setField(result.field ?? null);
        setStatus("error");
        if (result.field) document.getElementById(FIELD_IDS[result.field])?.focus();
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setMessage("We couldn't reach the server. Check your connection and try again.");
      setStatus("error");
    } finally {
      submitting.current = false;
    }
  }

  const invalid = (key: MentorProfileField) => (field === key ? true : undefined);
  const saving = status === "saving";

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8">
      {status === "saved" && (
        <Alert role="status">
          <AlertDescription>Your profile was updated.</AlertDescription>
        </Alert>
      )}
      {status === "error" && message && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={values.fullName} onChange={set("fullName")} aria-invalid={invalid("fullName")} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} aria-invalid={invalid("phone")} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            value={values.specialization}
            onChange={set("specialization")}
            placeholder="e.g. Psychology tests, GTO, Interview"
            aria-invalid={invalid("specialization")}
            disabled={saving}
          />
          <p className="text-[12px] text-ink-secondary">Separate several with commas.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="qualifications">Qualifications</Label>
          <Textarea id="qualifications" value={values.qualifications} onChange={set("qualifications")} aria-invalid={invalid("qualifications")} disabled={saving} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={values.bio} onChange={set("bio")} aria-invalid={invalid("bio")} disabled={saving} />
        </div>
        <Button type="submit" disabled={saving} aria-busy={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
