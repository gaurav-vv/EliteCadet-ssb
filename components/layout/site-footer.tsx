export function SiteFooter() {
  return (
    <footer id="about" className="scroll-mt-20 border-t border-[var(--site-line)] bg-[var(--site-bg-soft)]">
      <p className="mx-auto max-w-[1440px] px-4 py-5 text-sm text-[var(--site-muted)] sm:px-6 lg:px-12">
        © {new Date().getFullYear()} EliteCadet. All rights reserved.
      </p>
    </footer>
  );
}
