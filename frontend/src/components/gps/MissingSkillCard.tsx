import { Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MissingSkillCardProps {
  name: string;
  category?: string;
  learningDifficulty?: number;
}

export function MissingSkillCard({ name, category, learningDifficulty }: MissingSkillCardProps) {
  const difficultyLabel = learningDifficulty
    ? learningDifficulty <= 2
      ? "Easy"
      : learningDifficulty <= 4
      ? "Medium"
      : "Hard"
    : "Medium";

  return (
    <div className="flex items-center gap-2 rounded-md border border-[#e3e2e0] bg-[#fafafa] px-3 py-2">
      <Circle className="h-4 w-4 text-[#787774]" />
      <div className="flex-1">
        <div className="text-sm font-medium text-[#37352f]">{name}</div>
        <div className="mt-1 flex gap-2">
          {category && (
            <Badge variant="secondary" className="text-xs">
              {category}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {difficultyLabel}
          </Badge>
        </div>
      </div>
    </div>
  );
}
