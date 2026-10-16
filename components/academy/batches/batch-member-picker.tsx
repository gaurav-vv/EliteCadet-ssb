"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BatchMemberPickerProps {
  id: string;
  label: string;
  placeholder: string;
  buttonLabel: string;
  emptyHint: string;
  options: { id: string; name: string }[];
  // A Server Action .bind()-ed with the batch id on the server; called with the chosen id.
  action: (chosenId: string) => Promise<{ ok: boolean; error?: { message: string } }>;
}

// "Pick one, add it" control used for both students and mentors on the batch
// page. The server re-checks academy, role and batch on every call.
export function BatchMemberPicker({ id, label, placeholder, buttonLabel, emptyHint, options, action }: BatchMemberPickerProps) {
  const router = useRouter();
  const [chosen, setChosen] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return <p className="text-[13px] text-ink-secondary">{emptyHint}</p>;

  async function add() {
    if (!chosen) return;
    setPending(true);
    setError(null);
    try {
      const result = await action(chosen);
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      setChosen("");
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Select value={chosen} onValueChange={setChosen} disabled={pending}>
            <SelectTrigger id={id} className="min-h-11 w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="min-h-11" onClick={add} disabled={pending || !chosen}>
          {pending ? "Adding…" : buttonLabel}
        </Button>
      </div>
    </div>
  );
}
