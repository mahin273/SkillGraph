import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { ErrorBoundary } from "./ErrorBoundary";
import { getCurrentUser, logout } from "../../services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout() {
  const location = useLocation();
  const { setUser, userId, role, isVerified, clearUser } = useAuthStore();
  const [loading, setLoading] = useState(!userId);

  useEffect(() => {
    if (!userId) {
      getCurrentUser()
        .then((user) => {
          setUser(user);
          setLoading(false);
        })
        .catch(() => {
          window.location.href = "/login";
        });
    } else {
      setLoading(false);
    }
  }, [userId, setUser]);

  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="grid h-screen w-screen place-items-center bg-[#f6f7f9]">
        <div className="flex flex-col items-center gap-2">
          <div className="size-8 animate-spin rounded-full border-4 border-[#0c66e4] border-t-transparent" />
          <p className="text-sm font-medium text-[#44546f]">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const isUnverified = isVerified === false && ["student", "professor", "alumni"].includes(role || "");
  const isSettingsPage = location.pathname === "/settings";

  if (isUnverified && !isSettingsPage) {
    return (
      <div className="min-h-screen bg-[#f6f7f9] text-[#17202a]">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8 flex items-center justify-center">
            <div className="max-w-md w-full rounded-2xl border border-[#dfe3ea] bg-white p-8 shadow-lg text-center animate-fade-in">
              <div className="mx-auto grid size-16 place-items-center rounded-full bg-[#fff0ec] text-[#de350b] mb-6">
                <ShieldAlert className="size-8" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#17202a] mb-3">
                {role === "student" ? "Verification Required" : "Registration Pending Approval"}
              </h1>
              <p className="text-sm text-[#44546f] leading-relaxed mb-6">
                {role === "student"
                  ? "Your student account requires verification. Please ensure your academic email matches your university's allowed domains in settings."
                  : "Your academic registration is pending review by your university administrator. You will receive an email confirmation once your account has been approved and activated."}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => window.location.href = "/settings"}
                  className="bg-[#0c66e4] hover:bg-[#0055cc] text-white text-xs font-semibold h-10 transition-colors"
                >
                  View Profile Settings
                </Button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-1.5 text-xs text-[#626f86] hover:text-[#17202a] font-medium py-2 transition-colors"
                >
                  <LogOut className="size-4" />
                  Log Out
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#17202a]">
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8">
          <ErrorBoundary resetKey={location.pathname}>
            <div key={location.pathname}>
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
