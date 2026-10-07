"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createContentAction, updateContentAction } from "@/lib/actions/content";
import { createMyContentAction, updateMyContentAction } from "@/lib/actions/mentor-content";
import {
  CONTENT_AUDIENCES,
  CONTENT_CATEGORIES,
  CONTENT_DIFFICULTIES,
  CONTENT_TYPES,
  CONTENT_VISIBILITIES,
  type ContentInput,
  type ContentRecord,
} from "@/types/content";

type Errors = Partial<Record<keyof ContentInput, string>>;

function initial(c?: ContentRecord): ContentInput {
  return {
    title: c?.title ?? "",
    description: c?.description ?? "",
    category: c?.category ?? "psychology",
    type: c?.type ?? "study_material",
    difficulty: c?.difficulty ?? "medium",
    targetRole: c?.targetRole ?? "student",
    visibility: c?.visibility ?? "everyone",
    body: c?.body ?? "",
    externalUrl: c?.externalUrl ?? "",
    isTemplate: c?.isTemplate ?? false,
  };
}

const SELECTS: { key: keyof ContentInput; label: string; options: Record<string, string> }[] = [
  { key: "category", label: "Category", options: CONTENT_CATEGORIES },
  { key: "type", label: "Type", options: CONTENT_TYPES },
  { key: "difficulty", label: "Difficulty", options: CONTENT_DIFFICULTIES },
  { key: "targetRole", label: "For", options: CONTENT_AUDIENCES },
  { key: "visibility", label: "Who can see it", options: CONTENT_VISIBILITIES },
];

// Create (no `content`) or edit. New content always starts as a draft; the
// server re-validates every field. "mentor" mode hides audience/visibility
// (mentor content is always for students in the mentor's assigned batches)
// and the template switch (platform-only).
export function ContentForm({ content, mode = "platform" }: { content?: ContentRecord; mode?: "platform" | "mentor" }) {
  const base = mode === "mentor" ? "/mentor/content" : "/admin/content";
  const selects = mode === "mentor" ? SELECTS.filter((s) => s.key !== "targetRole" && s.key !== "visibility") : SELECTS;
  const router = useRouter();
  const [values, setValues] = useState<ContentInput>(initial(content));
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof ContentInput) => (value: string) => setValues((v) => ({ ...v, [key]: value }));
  const err = (key: keyof ContentInput) =>
    errors[key] ? (
      <p id={`content-${key}-error`} role="alert" className="text-[12px] text-(--academy-danger-text)">
        {errors[key]}
      </p>
    ) : null;
  const a11y = (key: keyof ContentInput) => ({ "aria-invalid": Boolean(errors[key]), "aria-describedby": errors[key] ? `content-${key}-error` : undefined });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result =
        mode === "mentor"
          ? content
            ? await updateMyContentAction(content.id, values)
            : await createMyContentAction(values)
          : content
            ? await updateContentAction(content.id, values)
            : await createContentAction(values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage({ tone: "error", text: result.error?.message ?? "We couldn't save the content. Please try again." });
        return;
      }
      setErrors({});
      if (!content && result.data && "id" in result.data) {
        router.push(`${base}/${result.data.id}`);
        return;
      }
      setMessage({ tone: "success", text: "Changes saved." });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "We couldn't reach the server. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="glass-regular flex flex-col gap-5 rounded-card px-6 py-6">
      {message && (
        <Alert variant={message.tone === "error" ? "destructive" : "default"} role={message.tone === "error" ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-title">Title</Label>
        <Input id="content-title" className="min-h-11" value={values.title} onChange={(e) => set("title")(e.target.value)} disabled={pending} {...a11y("title")} />
        {err("title")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-description">Short description (optional)</Label>
        <Textarea id="content-description" rows={2} value={values.description} onChange={(e) => set("description")(e.target.value)} disabled={pending} {...a11y("description")} />
        {err("description")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {selects.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5">
            <Label htmlFor={`content-${s.key}`}>{s.label}</Label>
            <Select value={String(values[s.key] ?? "")} onValueChange={set(s.key)} disabled={pending}>
              <SelectTrigger id={`content-${s.key}`} className="min-h-11 w-full" {...a11y(s.key)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(s.options).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err(s.key)}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-body">Content</Label>
        <Textarea id="content-body" rows={10} value={values.body} onChange={(e) => set("body")(e.target.value)} disabled={pending} {...a11y("body")} />
        <p className="text-[12px] text-ink-secondary">Plain text; line breaks are kept. Add a link below for a video or document.</p>
        {err("body")}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="content-externalUrl">Link (optional)</Label>
        <Input id="content-externalUrl" type="url" className="min-h-11" placeholder="https://" value={values.externalUrl} onChange={(e) => set("externalUrl")(e.target.value)} disabled={pending} {...a11y("externalUrl")} />
        {err("externalUrl")}
      </div>
      {mode === "platform" && (
        <label className="flex min-h-11 items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-(--brand-accent)"
            checked={Boolean(values.isTemplate)}
            onChange={(e) => setValues((v) => ({ ...v, isTemplate: e.target.checked }))}
            disabled={pending}
          />
          <span>
            Offer as a starter template to mentors
            <span className="block text-[12px] text-ink-secondary">Once published, any mentor can copy it into their own content and adapt it.</span>
          </span>
        </label>
      )}
      <div className="flex justify-end">
        <Button type="submit" className="min-h-11" disabled={pending}>
          {pending ? "Saving…" : content ? "Save changes" : "Save as draft"}
        </Button>
      </div>
    </form>
  );
}
