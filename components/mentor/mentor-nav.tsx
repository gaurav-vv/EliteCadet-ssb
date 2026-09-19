"use client";

import { usePathname } from "next/navigation";
import { CapsuleSmall, type CapsuleIconName } from "@/components/ui/capsule";

interface NavItem {
  href: string;
  label: string;
  icon: CapsuleIconName;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/mentor", label: "Dashboard", icon: "dashboard" },
  { href: "/mentor/mentees", label: "Mentees", icon: "mentees" },
  { href: "/mentor/evaluations", label: "Evaluations", icon: "evaluations" },
  { href: "/mentor/sessions", label: "Sessions", icon: "sessions" },
  { href: "/mentor/profile", label: "Profile", icon: "profile" },
];

function isActive(pathname: string, href: string) {
  if (href === "/mentor") return pathname === "/mentor";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MentorNav() {
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
      <nav aria-label="Mentor" className="hidden flex-col gap-2 md:flex">
        {items}
      </nav>
      <nav aria-label="Mentor" className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {items}
      </nav>
    </>
  );
}
