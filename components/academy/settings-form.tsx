"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { updateMyAcademyAction } from "@/lib/actions/academies";
import { updateFullName } from "@/lib/auth/update-profile";
import type { AcademyInput, AcademyRecord } from "@/types/academies";

type FieldErrors = Partial<Record<keyof AcademyInput, string>>;

interface SettingsFormProps {
  academy: AcademyRecord;
  adminName: string;
}

// The academy admin's own academy (real Postgres row, scoped by their session
// on the server) plus their own display name.
export function SettingsForm({ academy, adminName: initialAdminName }: SettingsFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<AcademyInput>({
    name: academy.name,
    description: academy.description ?? "",
    logoUrl: academy.logoUrl ?? "",
    contactEmail: academy.contactEmail ?? "",
    contactPhone: academy.contactPhone ?? "",
  });
  const [adminName, setAdminName] = useState(initialAdminName);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const field = (key: keyof AcademyInput) => ({
    id: `settings-${key}`,
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `settings-${key}-error` : undefined,
    disabled: status === "saving",
  });
  const fieldError = (key: keyof AcademyInput) =>
    errors[key] ? (
      <p id={`settings-${key}-error`} className="text-[12px] text-(--academy-danger-text)">
        {errors[key]}
      </p>
    ) : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setErrorMessage(null);
    try {
      const academyResult = await updateMyAcademyAction(values);
      if (!academyResult.ok) {
        setErrors(academyResult.fieldErrors ?? {});
        setStatus("error");
        setErrorMessage(academyResult.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setErrors({});
      const nameResult = await updateFullName(adminName);
      if (!nameResult.ok) {
        setStatus("error");
        setErrorMessage(nameResult.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("saved");
      router.refresh();
    } catch {
      setStatus("error");
      setErrorMessage("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="glass-regular flex flex-col gap-6 px-8 py-8">
      {status === "saved" && (
        <Alert role="status">
          <AlertDescription>Settings updated.</AlertDescription>
        </Alert>
      )}
      {status === "error" && errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-name">Academy name</Label>
          <Input {...field("name")} />
          {fieldError("name")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-description">Description</Label>
          <Textarea rows={3} {...field("description")} />
          {fieldError("description")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-contactEmail">Contact email</Label>
          <Input type="email" {...field("contactEmail")} />
          {fieldError("contactEmail")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-contactPhone">Contact phone</Label>
          <Input type="tel" {...field("contactPhone")} />
          {fieldError("contactPhone")}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="settings-logoUrl">Logo link</Label>
          <Input type="url" {...field("logoUrl")} />
          {fieldError("logoUrl") ?? <p className="text-[12px] text-ink-secondary">An https:// image link. File upload comes later.</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="adminName">Your name</Label>
          <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} disabled={status === "saving"} />
        </div>
        <Button type="submit" className="min-h-11" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
