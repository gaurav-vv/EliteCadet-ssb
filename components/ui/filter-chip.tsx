interface FilterChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

// data-active drives the CSS in app/globals.css — a conditional border-*
// Tailwind class here would be silently beaten by .glass-thin's own
// unlayered border declaration (AGENTS.md §7.12).
export function FilterChip({ label, selected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-active={selected}
      className="filter-chip glass-thin rounded-pill px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap text-ink-secondary"
    >
      {label}
    </button>
  );
}
