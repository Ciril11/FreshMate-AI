import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Plane,
  QrCode,
  Sparkles,
  PackageSearch,
  Users,
  Map as MapIcon,
  Briefcase,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/timetable", label: "Timetable", icon: CalendarDays, end: false },
  { to: "/planner", label: "Academic Planner", icon: ClipboardList, end: false },
  { to: "/holidays", label: "Holidays", icon: Plane, end: false },
  { to: "/attendance", label: "Attendance", icon: QrCode, end: false },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles, end: false },
  { to: "/lost-found", label: "Lost & Found", icon: PackageSearch, end: false },
  { to: "/mentors", label: "Senior Connect", icon: Users, end: false },
  { to: "/placements", label: "Placement Hub", icon: Briefcase, end: false },
  { to: "/campus-map", label: "Campus Navigation", icon: MapIcon, end: false },
];

export function Sidebar() {
  return (
    <aside className="relative hidden w-64 shrink-0 flex-col border-r border-violet-900/50 bg-black md:flex">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-10 h-48 w-48 rounded-full bg-violet-700/20 blur-3xl" />
      </div>
      <div className="relative z-10 flex items-center gap-2 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-900/50">
          <Plane className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">
            FreshMate AI
          </p>
          <p className="text-[11px] text-violet-400/70">Your campus assistant</p>
        </div>
      </div>
      <nav className="relative z-10 flex-1 space-y-1 px-3 py-2">
        {nav.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-violet-600/20 text-violet-200 shadow-inner shadow-violet-900/30"
                  : "text-violet-300/70 hover:bg-violet-900/30 hover:text-violet-200"
              }`
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <UserBox />
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-violet-900/50 bg-black py-2 md:hidden">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] ${
              isActive ? "text-violet-300" : "text-violet-500/60"
            }`
          }
        >
          <n.icon className="h-5 w-5" />
          {n.label.split(" ")[0]}
        </NavLink>
      ))}
    </nav>
  );
}

function UserBox() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="relative z-10 border-t border-violet-900/40 px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30 text-xs font-semibold text-violet-200">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-violet-100">
            {user.name}
          </p>
          <p className="truncate text-[10px] text-violet-400/60">{user.email}</p>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/auth");
          }}
          className="rounded-lg p-1.5 text-violet-400/70 hover:bg-rose-950/40 hover:text-rose-400"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function PageShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-violet-300/70">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
