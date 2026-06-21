import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";

interface IngestionStatusBannerProps {
  status?: "queued" | "processing" | "completed" | "failed" | "rate_limited" | "not_started";
  message?: string;
  error?: string | null;
  repositoryCount?: number;
  skillsFound?: number;
}

export function IngestionStatusBanner({
  status,
  message,
  error,
  repositoryCount,
  skillsFound,
}: IngestionStatusBannerProps) {
  if (!status && !error) return null;

  const getStatusConfig = () => {
    if (error || status === "failed") {
      return {
        icon: XCircle,
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800",
        iconColor: "text-red-500",
        title: "Ingestion Failed",
        description: error || message || "An error occurred during ingestion",
      };
    }

    switch (status) {
      case "queued":
        return {
          icon: Clock,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          iconColor: "text-blue-500",
          title: "Queued",
          description: "Your repositories are queued for processing",
        };
      case "processing":
        return {
          icon: Clock,
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          iconColor: "text-blue-500",
          title: "Processing",
          description: "Analyzing your repositories...",
        };
      case "completed":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          iconColor: "text-green-500",
          title: "Completed",
          description: `Found ${skillsFound || 0} skills across ${repositoryCount || 0} repositories`,
        };
      case "rate_limited":
        return {
          icon: AlertCircle,
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
          textColor: "text-amber-800",
          iconColor: "text-amber-500",
          title: "Rate Limited",
          description: message || "Please wait before triggering another scan",
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className={`rounded-md border ${config.borderColor} ${config.bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>
            {config.description}
          </p>
        </div>
      </div>
    </div>
  );
}
