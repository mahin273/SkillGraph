import type { GalaxyNode } from "../../services/graph.service";

export function SkillTooltip({ node }: { node: GalaxyNode | null }) {
  if (!node) return null;

  const isSkill = node.name && !node.handle && !node.fullName;
  const proficiency = node.proficiency ?? node.confidence;
  const projectCount = node.sourceRepos?.length ?? 0;
  const endorsementCount = node.endorsementCount ?? 0;

  return (
    <div className="pointer-events-none absolute left-4 top-4 max-w-xs rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold text-slate-900">{node.name ?? node.fullName ?? node.handle ?? node.id}</div>
      
      {isSkill && typeof proficiency === "number" && (
        <div className="mt-1 text-slate-600">
          Proficiency: {Math.round(proficiency * 100)}%
        </div>
      )}
      
      {isSkill && projectCount > 0 && (
        <div className="mt-1 text-slate-600">
          Projects: {projectCount}
        </div>
      )}
      
      {isSkill && endorsementCount > 0 && (
        <div className="mt-1 text-slate-600">
          Endorsements: {endorsementCount}
        </div>
      )}
      
      {node.dormant && (
        <div className="mt-1 text-amber-600 text-xs">
          ⚠ Dormant skill
        </div>
      )}
    </div>
  );
}
