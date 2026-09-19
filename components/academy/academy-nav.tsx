"use client";

import { usePathname } from "next/navigation";
import { CapsuleSmall, type CapsuleIconName } from "@/components/ui/capsule";

interface NavItem {
  href: string;
  label: string;
  icon: CapsuleIconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/academy", label: "Dashboard", icon: "dashboard" },
  { href: "/academy/students", label: "Students", icon: "students" },
  { href: "/academy/batches", label: "Batches", icon: "batches" },
  { href: "/academy/mentors", label: "Mentors", icon: "mentees" },
  { href: "/academy/reports", label: "Reports", icon: "reports" },
  { href: "/academy/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/academy") return pathname === "/academy";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AcademyNav() {
  const pathname = usePathname();

  const items = NAV_ITEMS.map((item) => (
    <CapsuleSmall
      key={item.href}
      href={item.href}
      icon={item.icon}
      label={item.label}
      selected={isActive(pathname, item.href)}
    />
  ));

  return (
    <>
      <nav aria-label="Academy" className="hidden flex-col gap-2 md:flex">
        {items}
      </nav>
      <nav aria-label="Academy" className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {items}
      </nav>
    </>
  );
}
