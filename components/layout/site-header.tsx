import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="glass-thick sticky top-4 z-10 mx-4 rounded-panel sm:mx-6">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-accent"
        >
          SSB Academy
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="shadow-glow-accent">
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
