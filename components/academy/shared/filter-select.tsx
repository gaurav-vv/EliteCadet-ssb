"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "cn";

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  // Accessible name, e.g. "Filter by mentor".
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}

// Compact dropdown used by Academy list toolbars (filters and sort).
export function FilterSelect({ label, value, onChange, options, className }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("h-11 w-full sm:h-10 sm:w-auto sm:min-w-36", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
