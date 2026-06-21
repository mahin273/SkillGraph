import { Github } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export function GitHubConnectButton({ label = "Continue with GitHub", link = false }: { label?: string; link?: boolean }) {
  const handleConnect = () => {
    window.location.href = `${API_BASE_URL}/auth/github${link ? "?link=1" : ""}`;
  };

  return (
    <button
      onClick={handleConnect}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-[#e3e2e0] bg-white px-4 py-2.5 text-sm font-medium text-[#37352f] transition-colors hover:bg-[#fafafa]"
    >
      <Github size={18} />
      {label}
    </button>
  );
}
