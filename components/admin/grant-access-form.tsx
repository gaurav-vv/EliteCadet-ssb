"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMIN_AREAS, ADMIN_AREA_LABELS, isAdminArea } from "@/lib/admin/access";
import { grantAdminAccessAction } from "@/lib/actions/admin-access";
import type { AdminArea } from "@/types/admin";

export function GrantAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [area, setArea] = useState<AdminArea>("student_content");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const result = await grantAdminAccessAction({ email, area });
      if (!result.ok) {
        setStatus("error");
        setMessage(result.error?.message ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(`${ADMIN_AREA_LABELS[area]} access granted to ${email.trim()}.`);
      setEmail("");
      router.refresh();
    } catch {
      // A thrown action (network drop, server restart) must not leave the
      // form stuck in "Granting…" — the typed email is kept for a retry.
      setStatus("error");
      setMessage("We couldn't reach the server. Check your connection and try again.");
    }
  }

  return (
    <div className="glass-regular flex flex-col gap-4 rounded-card px-6 py-6">
      <h2 className="text-[18px] font-bold text-ink">Grant access</h2>
      {message && (
        <Alert variant={status === "error" ? "destructive" : "default"} role={status === "error" ? "alert" : "status"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grantEmail">Account email</Label>
          <Input
            id="grantEmail"
            type="email"
            required
            autoComplete="off"
            className="min-h-11"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "loading"}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="grantArea">Area</Label>
          <Select value={area} onValueChange={(v) => isAdminArea(v) && setArea(v)} disabled={status === "loading"}>
            <SelectTrigger id="grantArea" className="min-h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADMIN_AREAS.map((a) => (
                <SelectItem key={a} value={a}>
                  {ADMIN_AREA_LABELS[a]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" className="min-h-11" disabled={status === "loading"}>
          {status === "loading" ? "Granting…" : "Grant access"}
        </Button>
      </form>
      <p className="text-[12px] text-ink-secondary">
        The person needs an account already. A super admin can manage every area and everyone&apos;s access.
      </p>
    </div>
  );
}
