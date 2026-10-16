"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAvailabilityAction } from "@/lib/actions/sessions";
import { WEEKDAYS } from "@/types/sessions";

// Add a weekly availability slot (IST). Listing and removal are on the page.
export function AvailabilityEditor() {
  const router = useRouter();
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setPending(true);
    setError(null);
    try {
      const result = await addAvailabilityAction({ weekday, startTime, endTime });
      if (!result.ok) {
        setError(result.error?.message ?? "That didn't work. Please try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slot-day">Day</Label>
          <Select value={weekday} onValueChange={setWeekday} disabled={pending}>
            <SelectTrigger id="slot-day" className="min-h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{WEEKDAYS.map((d, i) => <SelectItem key={d} value={String(i)}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slot-start">From (IST)</Label>
          <Input id="slot-start" type="time" className="min-h-11" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={pending} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slot-end">To (IST)</Label>
          <Input id="slot-end" type="time" className="min-h-11" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={pending} />
        </div>
        <Button type="button" className="min-h-11" onClick={add} disabled={pending}>{pending ? "Adding…" : "Add slot"}</Button>
      </div>
    </div>
  );
}
