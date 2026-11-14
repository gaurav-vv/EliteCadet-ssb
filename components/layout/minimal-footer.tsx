// Footer for standalone pages that sit outside both shells (onboarding,
// forbidden). Dark navy like the other footers. The colour matches
// `--site-navy`, which is only defined inside `.site-public` (that class also
// forces a white background, so it can't be used here). See DESIGN.md.
export function MinimalFooter() {
  return (
    <footer className="bg-[#0b1a38] px-6 py-5 text-center text-[12px] text-white/70">
      &copy; {new Date().getFullYear()} EliteCadet. All rights reserved.
    </footer>
  );
}
