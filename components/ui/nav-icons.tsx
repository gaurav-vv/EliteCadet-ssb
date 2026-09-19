import {
  LayoutDashboard,
  Target,
  BookOpen,
  LineChart,
  Brain,
  MessageSquare,
  User,
  Users,
  Building2,
  Settings,
  Library,
  UserCircle,
  ClipboardCheck,
  CalendarClock,
  GraduationCap,
  Layers,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

// Named registry, not a component-reference prop: a Server Component can't
// pass a component reference to a Client Component across the RSC boundary
// (AGENTS.md §7.12). Add an entry here the first time a new nav item or
// stat card needs an icon.
export const navIcons = {
  dashboard: LayoutDashboard,
  mission: Target,
  practice: BookOpen,
  progress: LineChart,
  psychology: Brain,
  interview: MessageSquare,
  student: User,
  mentees: Users,
  academy: Building2,
  settings: Settings,
  resources: Library,
  profile: UserCircle,
  evaluations: ClipboardCheck,
  sessions: CalendarClock,
  students: GraduationCap,
  batches: Layers,
  reports: BarChart3,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIcons;
