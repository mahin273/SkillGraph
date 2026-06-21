import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

type OAuthCallbackProps = {
  provider: "github" | "google";
};

export function OAuthCallback({ provider }: OAuthCallbackProps) {
  const location = useLocation();

  useEffect(() => {
    window.location.replace(`${API_BASE_URL}/auth/${provider}/callback${location.search}`);
  }, [location.search, provider]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f9] px-4 text-[#17202a]">
      <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Completing sign in...</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please wait while SkillGraph finishes the OAuth flow.</p>
      </div>
    </main>
  );
}
