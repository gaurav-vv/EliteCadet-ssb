export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-6 py-8 text-center text-sm text-text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} SSB Academy. All rights reserved.</p>
        <p>AI-assisted preparation guidance, not an official SSB assessment.</p>
      </div>
    </footer>
  );
}
