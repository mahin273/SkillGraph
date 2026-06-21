import { Chrome } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export function GoogleConnectButton({ label = "Continue with Google" }: { label?: string }) {
  const handleConnect = () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  return (
    <button
      onClick={handleConnect}
      className="flex w-full items-center justify-center gap-2 rounded-md border border-[#dfe3ea] bg-white px-4 py-2.5 text-sm font-medium text-[#17202a] transition-colors hover:bg-[#f7f8fa]"
    >
      <Chrome size={18} />
      {label}
    </button>
  );
}
