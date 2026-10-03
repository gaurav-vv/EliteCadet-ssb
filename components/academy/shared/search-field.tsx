import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  // Accessible name (the visible placeholder alone is not a label).
  label: string;
  maxLength?: number;
}

// Pill search box used by Academy list toolbars.
export function SearchField({ value, onChange, placeholder, label, maxLength = 100 }: SearchFieldProps) {
  return (
    <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-pill border border-hairline bg-white px-4 focus-within:border-brand-accent focus-within:ring-2 focus-within:ring-brand-accent/25 sm:h-10">
      <Search aria-hidden="true" size={16} className="shrink-0 text-ink-secondary" />
      <span className="sr-only">{label}</span>
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
    </label>
  );
}
