import { CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompletedSkillBadgeProps {
  name: string;
  category?: string;
}

export function CompletedSkillBadge({ name, category }: CompletedSkillBadgeProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#e3e2e0] bg-white px-3 py-2">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <div className="flex-1">
        <div className="text-sm font-medium text-[#37352f]">{name}</div>
        {category && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {category}
          </Badge>
        )}
      </div>
    </div>
  );
}
