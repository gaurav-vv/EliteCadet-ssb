"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SITE_NAV_LINKS } from "@/components/layout/site-nav-links";

// Below the lg breakpoint the public nav collapses into this disclosure menu.
export function SiteMobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="site-btn site-btn-secondary site-btn-sm px-3"
        aria-expanded={open}
        aria-controls="site-mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
      </button>
      {open && (
        <div
          id="site-mobile-menu"
          className="absolute inset-x-0 top-16 border-b border-[var(--site-line)] bg-[var(--site-bg)] px-4 pb-6 pt-2 shadow-[var(--site-shadow)] sm:px-6"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {SITE_NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={close} className="site-link flex min-h-11 items-center text-base">
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link href="/request-demo" onClick={close} className="site-btn site-btn-secondary">
              Request Demo
            </Link>
            <Link href="/login" onClick={close} className="site-btn site-btn-secondary">
              Login
            </Link>
            <Link href="/signup" onClick={close} className="site-btn site-btn-primary">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
