"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateSettingsAction } from "@/lib/actions/academy";
import { updateAcademyName, updateFullName } from "@/lib/auth/update-profile";
import type { AcademySettings } from "@/types/academy";

interface SettingsFormProps {
  settings: AcademySettings;
  academyId: string | null;
}

export function SettingsForm({ settings, academyId }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<AcademySettings>(settings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");

    const nameResult = await updateFullName(values.adminName);
    if (!nameResult.ok) {
      setStatus("error");
      setErrorMessage(nameResult.message ?? "Something went wrong. Please try again.");
      return;
    }

    if (academyId) {
      const academyResult = await updateAcademyName(academyId, values.academyName);
      if (!academyResult.ok) {
        setStatus("error");
        setErrorMessage(academyResult.message ?? "Something went wrong. Please try again.");
        return;
      }
    }

    // Contact email has no real column yet — kept in the mock settings store
    // until the academy domain migrates to Postgres (status.md → Technical Debt).
    await updateSettingsAction(values);

    setStatus("saved");
    router.refresh();
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8">
      {status === "saved" && (
        <Alert>
          <AlertDescription>Settings updated.</AlertDescription>
        </Alert>
      )}
      {status === "error" && errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="academyName">Academy name</Label>
          <Input id="academyName" value={values.academyName} onChange={(e) => setValues((v) => ({ ...v, academyName: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contactEmail">Contact email</Label>
          <Input id="contactEmail" type="email" value={values.contactEmail} onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adminName">Admin name</Label>
          <Input id="adminName" value={values.adminName} onChange={(e) => setValues((v) => ({ ...v, adminName: e.target.value }))} />
        </div>
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
