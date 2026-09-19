"use client";

import { usePathname } from "next/navigation";
import { CapsuleSmall, type CapsuleIconName } from "@/components/ui/capsule";

interface NavItem {
  href: string;
  label: string;
  icon: CapsuleIconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/student", label: "Dashboard", icon: "dashboard" },
  { href: "/student/practice", label: "Practice", icon: "practice" },
  { href: "/student/progress", label: "Progress", icon: "progress" },
  { href: "/student/resources", label: "Resources", icon: "resources" },
  { href: "/student/profile", label: "Profile", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/student") return pathname === "/student";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudentNav() {
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
      <nav aria-label="Student" className="hidden flex-col gap-2 md:flex">
        {items}
      </nav>
      <nav aria-label="Student" className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {items}
      </nav>
    </>
  );
}
