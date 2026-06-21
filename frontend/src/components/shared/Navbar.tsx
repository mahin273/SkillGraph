import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth.store";
import { NotificationBell } from "../notifications/NotificationBell";

export function Navbar() {
  const location = useLocation();
  const { fullName, avatarUrl } = useAuthStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#e3e2e0] bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="text-lg font-semibold text-[#37352f]">
            SkillGraph
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <Link
              to="/"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/")
                  ? "bg-[#f7f6f3] text-[#37352f]"
                  : "text-[#787774] hover:bg-[#f7f6f3] hover:text-[#37352f]"
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/career-gps"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/career-gps")
                  ? "bg-[#f7f6f3] text-[#37352f]"
                  : "text-[#787774] hover:bg-[#f7f6f3] hover:text-[#37352f]"
              }`}
            >
              Career GPS
            </Link>
            <Link
              to="/matchmaker"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/matchmaker")
                  ? "bg-[#f7f6f3] text-[#37352f]"
                  : "text-[#787774] hover:bg-[#f7f6f3] hover:text-[#37352f]"
              }`}
            >
              Matchmaker
            </Link>
            <Link
              to="/resources"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive("/resources")
                  ? "bg-[#f7f6f3] text-[#37352f]"
                  : "text-[#787774] hover:bg-[#f7f6f3] hover:text-[#37352f]"
              }`}
            >
              Resources
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt={fullName || "User"}
                className="h-7 w-7 rounded-full border border-[#e3e2e0]"
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
