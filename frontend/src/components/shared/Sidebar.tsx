import { NavLink } from "react-router-dom";
import {
  BriefcaseBusiness,
  Compass,
  Gauge,
  GitFork,
  GraduationCap,
  LayoutDashboard,
  Library,
  LifeBuoy,
  LogOut,
  Network,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { logout } from "../../services/auth.service";
import { NotificationBell } from "../notifications/NotificationBell";
import { NotificationDropdown } from "../notifications/NotificationDropdown";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/career-gps", label: "Career GPS", icon: Compass },
  { to: "/matchmaker", label: "Matchmaker", icon: Users },
  { to: "/resources", label: "Resources", icon: Library },
  { to: "/simulator", label: "Simulator", icon: GitFork },
  { to: "/career-fair", label: "Career Fair", icon: BriefcaseBusiness },
  { to: "/mentors", label: "Mentors", icon: GraduationCap },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin", label: "Admin", icon: Gauge },
];

const hotkeys: Record<string, string> = {
  "/dashboard": "D",
  "/career-gps": "G",
  "/matchmaker": "M",
  "/resources": "R",
  "/simulator": "S",
  "/career-fair": "F",
  "/mentors": "L",
  "/settings": "P",
  "/admin": "A",
};

export function Sidebar() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { fullName, avatarUrl, publicHandle, role, isVerified, clearUser } = useAuthStore();

  async function handleLogout() {
    await logout();
    clearUser();
    window.location.href = "/";
  }

  const isUnverified = isVerified === false && ["student", "professor", "alumni"].includes(role || "");

  const visibleLinks = links
    .map((link) => {
      if (link.to === "/admin" && role === "professor") {
        return { ...link, label: "Analytics" };
      }
      if (link.to === "/admin" && (role === "admin" || role === "superadmin")) {
        return { ...link, label: "Dashboard", icon: LayoutDashboard };
      }
      return link;
    })
    .filter((link) => {
      if (isUnverified) {
        return link.to === "/settings";
      }
      if (role === "admin" || role === "superadmin") {
        return ["/admin", "/settings"].includes(link.to);
      }
      if (role === "alumni") {
        return ["/dashboard", "/career-fair", "/settings"].includes(link.to);
      }
      if (role === "professor") {
        return ["/admin", "/settings"].includes(link.to);
      }
      return link.to !== "/admin";
    });

  return (
    <aside className="shrink-0 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-r lg:border-border lg:bg-background lg:px-4 lg:py-5">
      <div className="hidden h-full flex-col lg:flex">
        {/* Brand logo */}
        <div className="mb-5 flex items-center gap-3 px-1">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Network className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">SkillGraph</p>
            <p className="truncate text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Workspace</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative mb-4 rounded-xl border border-border bg-card p-2.5 shadow-sm transition-all hover:bg-accent/10">
          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || "User"}
                className="size-8 rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="grid size-8 place-items-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground border border-border">
                {(fullName || "SG").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-foreground">{fullName || "Your profile"}</p>
              <p className="truncate text-[10px] text-muted-foreground font-mono">
                {publicHandle ? `@${publicHandle}` : "private_mode"}
              </p>
            </div>
            <NotificationBell onToggle={() => setNotificationsOpen((open) => !open)} />
          </div>
          {notificationsOpen && <NotificationDropdown onClose={() => setNotificationsOpen(false)} />}
        </div>

        {/* Navigation list */}
        <nav className="grid gap-1">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground border border-border/40 font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground border border-transparent",
                ].join(" ")
              }
              key={to}
              to={to}
              end={to === "/dashboard"}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
              <kbd className="pointer-events-none ml-auto hidden h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground/80 opacity-75 group-hover:inline-flex">
                {hotkeys[to]}
              </kbd>
            </NavLink>
          ))}
        </nav>

        {/* System Widget */}
        <div className="mt-auto space-y-2 rounded-xl border border-border bg-card p-3.5 text-[11px] text-muted-foreground shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Modern skill OS
          </div>
          <p className="leading-relaxed">Scan GitHub, map strengths, and plan the next role from one workspace.</p>
        </div>

        {/* Footer info */}
        <div className="mt-3 flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
          <LifeBuoy className="size-3.5" />
          <span>Feedback-ready beta</span>
        </div>
        
        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-2.5 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4 shrink-0" />
          Log out
        </button>
      </div>

      {/* Mobile view bottom nav */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur-md lg:hidden">
        <nav className="flex justify-around gap-1">
          {visibleLinks.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "grid min-w-14 place-items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] transition-all",
                  isActive ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground",
                ].join(" ")
              }
              key={to}
              to={to}
              end={to === "/dashboard"}
            >
              <Icon className="size-4" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
}
