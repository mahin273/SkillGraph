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
    <aside className="shrink-0 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-r lg:border-[#dfe3ea] lg:bg-[#fbfbfc] lg:px-3 lg:py-4">
      <div className="hidden h-full flex-col lg:flex">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-lg bg-[#17202a] text-white shadow-sm">
            <Network className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#17202a]">SkillGraph</p>
            <p className="truncate text-xs text-[#6b7280]">Workspace</p>
          </div>
        </div>

        <div className="relative mb-3 rounded-lg border border-[#e2e6ed] bg-white p-2 shadow-sm">
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName || "User"}
                className="size-8 rounded-md border border-[#e2e6ed] object-cover"
              />
            ) : (
              <div className="grid size-8 place-items-center rounded-md bg-[#edf2f7] text-xs font-semibold text-[#42526e]">
                {(fullName || "SG").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#17202a]">{fullName || "Your profile"}</p>
              <p className="truncate text-xs text-[#6b7280]">
                {publicHandle ? `/galaxy/${publicHandle}` : "Private workspace"}
              </p>
            </div>
            <NotificationBell onToggle={() => setNotificationsOpen((open) => !open)} />
          </div>
          {notificationsOpen && <NotificationDropdown onClose={() => setNotificationsOpen(false)} />}
        </div>

        <nav className="grid gap-1">
          {visibleLinks.map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#e9f2ff] text-[#0c66e4]"
                    : "text-[#44546f] hover:bg-[#eef1f6] hover:text-[#17202a]",
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

        <div className="mt-auto space-y-2 rounded-lg border border-[#e2e6ed] bg-white p-3 text-xs text-[#6b7280] shadow-sm">
          <div className="flex items-center gap-2 font-medium text-[#17202a]">
            <Sparkles className="size-3.5 text-[#0c66e4]" />
            Modern skill OS
          </div>
          <p>Scan GitHub, map strengths, and plan the next role from one workspace.</p>
        </div>

        <div className="mt-3 flex items-center gap-2 px-2 text-xs text-[#6b7280]">
          <LifeBuoy className="size-3.5" />
          <span>Feedback-ready beta</span>
        </div>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-[#974f0c] transition-colors hover:bg-[#fff4e5]"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dfe3ea] bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
        <nav className="flex justify-around gap-1">
          {visibleLinks.slice(0, 5).map(({ to, label, icon: Icon }) => (
            <NavLink
              className={({ isActive }) =>
                [
                  "grid min-w-14 place-items-center gap-1 rounded-lg px-2 py-1.5 text-[11px]",
                  isActive ? "bg-[#e9f2ff] text-[#0c66e4]" : "text-[#626f86]",
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
