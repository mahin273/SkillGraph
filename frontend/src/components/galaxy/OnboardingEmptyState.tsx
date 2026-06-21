import { Github } from "lucide-react";

type OnboardingEmptyStateProps = {
  onTriggerIngestion?: () => void;
  isIngesting?: boolean;
};

export function OnboardingEmptyState({ onTriggerIngestion, isIngesting }: OnboardingEmptyStateProps) {
  return (
    <div className="text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <Github size={32} className="text-slate-600" />
      </div>
      <div className="text-lg font-semibold text-slate-900">No galaxy data yet</div>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Connect your GitHub account and run ingestion to populate your skill galaxy with projects and confidence signals.
      </p>
      {onTriggerIngestion && (
        <button
          type="button"
          onClick={onTriggerIngestion}
          disabled={isIngesting}
          className="mt-4 inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Github size={16} />
          {isIngesting ? "Scanning..." : "Scan GitHub Repositories"}
        </button>
      )}
    </div>
  );
}
