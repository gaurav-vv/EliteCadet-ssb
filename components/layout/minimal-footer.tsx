// Footer for standalone pages that sit outside both shells (onboarding,
// forbidden). Glass-theme tokens only. See DESIGN.md.
export function MinimalFooter() {
  return (
    <footer className="px-6 py-5 text-center text-[12px] text-ink-secondary">
      &copy; {new Date().getFullYear()} EliteCadet. All rights reserved.
    </footer>
  );
}
