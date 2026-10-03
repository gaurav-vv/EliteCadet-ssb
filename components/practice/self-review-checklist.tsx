"use client";

interface SelfReviewChecklistProps {
  items: string[];
  checked: string[];
  onChange: (checked: string[]) => void;
}

export function SelfReviewChecklist({ items, checked, onChange }: SelfReviewChecklistProps) {
  function toggle(item: string) {
    onChange(checked.includes(item) ? checked.filter((c) => c !== item) : [...checked, item]);
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-xs font-medium text-ink-secondary">
        Self-review ({checked.length} of {items.length})
      </legend>
      {items.map((item) => (
        <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={checked.includes(item)}
            onChange={() => toggle(item)}
            className="size-4 shrink-0 accent-brand-accent"
          />
          <span>{item}</span>
        </label>
      ))}
    </fieldset>
  );
}
