import { CheckCircle } from "lucide-react";

interface EndorsementBadgeProps {
  endorsementCount: number;
  endorsed: boolean;
  size?: "sm" | "md" | "lg";
}

export function EndorsementBadge({ endorsementCount, endorsed, size = "md" }: EndorsementBadgeProps) {
  const sizeClasses = {
    sm: 16,
    md: 24,
    lg: 32
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  if (endorsementCount === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {endorsed && (
        <div title="Verified skill (2+ endorsements)">
          <CheckCircle 
            size={sizeClasses[size]}
            className="text-green-500"
          />
        </div>
      )}
      <span className={`${textSizeClasses[size]} font-medium text-gray-700`}>
        {endorsementCount} {endorsementCount === 1 ? "endorsement" : "endorsements"}
      </span>
    </div>
  );
}
