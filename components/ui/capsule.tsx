"use client";

import * as React from "react";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Target,
  BookOpen,
  LineChart,
  Brain,
  MessageSquare,
  User,
  Users,
  Building2,
  Settings,
  LayoutDashboard,
  Library,
  UserCircle,
  ClipboardCheck,
  CalendarClock,
  GraduationCap,
  Layers,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

// Named registry, not a component-reference prop: a Server Component can't
// pass a component reference to this Client Component across the RSC
// boundary, and it keeps every capsule on the one mandated icon family.
// Add an entry here the first time a new capsule needs an icon.
export const capsuleIcons = {
  mission: Target,
  practice: BookOpen,
  progress: LineChart,
  psychology: Brain,
  interview: MessageSquare,
  student: User,
  mentees: Users,
  academy: Building2,
  settings: Settings,
  dashboard: LayoutDashboard,
  resources: Library,
  profile: UserCircle,
  evaluations: ClipboardCheck,
  sessions: CalendarClock,
  students: GraduationCap,
  batches: Layers,
  reports: BarChart3,
} satisfies Record<string, LucideIcon>;

export type CapsuleIconName = keyof typeof capsuleIcons;

type CapsuleLevel = "primary" | "secondary" | "small";
type CapsuleStatus = "idle" | "loading" | "success" | "error";

interface CapsuleOwnProps {
  icon?: CapsuleIconName;
  label: string;
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  status?: CapsuleStatus;
  href?: string;
  external?: boolean;
  className?: string;
  onClick?: () => void;
}

type CapsuleProps = CapsuleOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CapsuleOwnProps | "type" | "onClick">;

const levelClassName: Record<CapsuleLevel, string> = {
  primary:
    "flex-col items-center gap-3 px-6 py-5 text-center sm:flex-row sm:text-left min-w-40",
  secondary: "flex-row items-center gap-3 px-5 py-3.5",
  small: "flex-row items-center gap-2 px-3.5 py-2 text-sm shrink-0",
};

const iconSize: Record<CapsuleLevel, number> = {
  primary: 24,
  secondary: 20,
  small: 16,
};

function buildCapsule(level: CapsuleLevel) {
  function Capsule({
    icon,
    label,
    description,
    selected = false,
    disabled = false,
    status = "idle",
    href,
    external = false,
    className,
    onClick,
    ...rest
  }: CapsuleProps) {
    const isLoading = status === "loading";
    const blocked = disabled || isLoading;
    const isInteractive = !blocked;
    const size = iconSize[level];
    const Icon = icon ? capsuleIcons[icon] : null;

    const sharedClassName = cn(
      "glass-surface group relative inline-flex select-none outline-none no-underline",
      "font-medium text-text-primary",
      levelClassName[level],
      level === "small" && "glass-surface--sm",
      isInteractive &&
        "cursor-pointer hover:-translate-y-0.5 hover:scale-[1.015] active:translate-y-0 active:scale-[0.99]",
      selected && "glass-surface--selected",
      status === "success" && !selected && "glass-surface--success",
      status === "error" && !selected && "glass-surface--error",
      blocked && "cursor-not-allowed opacity-50",
      className,
    );

    const leadingIcon = isLoading ? (
      <Loader2 aria-hidden="true" size={size} className="animate-spin text-brand-navy" />
    ) : status === "success" ? (
      <CheckCircle2 aria-hidden="true" size={size} className="text-success" />
    ) : status === "error" ? (
      <AlertCircle aria-hidden="true" size={size} className="text-danger" />
    ) : Icon ? (
      <Icon aria-hidden="true" size={size} />
    ) : null;

    const content = (
      <>
        {leadingIcon && (
          <span className="inline-flex shrink-0 items-center justify-center text-brand-navy">
            {leadingIcon}
          </span>
        )}
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate">{label}</span>
          {description && level === "primary" && (
            <span className="text-xs font-normal text-text-muted">{description}</span>
          )}
        </span>
        {isLoading && <span className="sr-only">Loading</span>}
        {status === "success" && <span className="sr-only">Success</span>}
        {status === "error" && <span className="sr-only">Error</span>}
      </>
    );

    if (href) {
      if (blocked) {
        return (
          <span
            role="link"
            aria-disabled="true"
            tabIndex={-1}
            className={sharedClassName}
            {...(rest as React.HTMLAttributes<HTMLSpanElement>)}
          >
            {content}
          </span>
        );
      }
      const isExternal = external || /^https?:\/\//.test(href);
      if (isExternal) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={sharedClassName}
            aria-current={selected ? "page" : undefined}
            onClick={onClick}
            {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          >
            {content}
          </a>
        );
      }
      return (
        <Link
          href={href}
          className={sharedClassName}
          aria-current={selected ? "page" : undefined}
          onClick={onClick}
          {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        className={sharedClassName}
        disabled={blocked}
        aria-pressed={selected}
        aria-busy={isLoading || undefined}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }
  Capsule.displayName = `Capsule${level[0].toUpperCase()}${level.slice(1)}`;
  return Capsule;
}

export const CapsulePrimary = buildCapsule("primary");
export const CapsuleSecondary = buildCapsule("secondary");
export const CapsuleSmall = buildCapsule("small");
