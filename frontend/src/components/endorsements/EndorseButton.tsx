import { useState } from "react";
import { api } from "../../services/api";

interface EndorseButtonProps {
  endorsedId: string;
  skillId?: string;
  skillName?: string;
  onEndorsed?: () => void;
  disabled?: boolean;
}

export function EndorseButton({ endorsedId, skillId, skillName, onEndorsed, disabled }: EndorseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEndorse = async () => {
    setLoading(true);
    setError(null);

    try {
      await api.post("/endorsements/submit", {
        endorsedId,
        skillId,
        skillName
      });
      
      onEndorsed?.();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || "Failed to submit endorsement";
      setError(errorMessage);
      console.error("Endorsement error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleEndorse}
        disabled={disabled || loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Endorsing..." : "Endorse Skill"}
      </button>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
