import { Building2, Users } from "lucide-react";
import type { MatchScope, MatchmakerCandidate } from "../../services/matchmaker.service";

type TeamCompositionPanelProps = {
  requiredSkills: string[];
  candidates: MatchmakerCandidate[];
  scope: MatchScope;
  invitedCount: number;
};

const scopeLabel: Record<MatchScope, string> = {
  same_department: "Same department",
  same_university: "Same university",
  all_universities: "All universities"
};

export function TeamCompositionPanel({ requiredSkills, candidates, scope, invitedCount }: TeamCompositionPanelProps) {
  const coveredSkills = new Set(candidates.flatMap((candidate) => candidate.matchedSkills.map((skill) => skill.name.toLowerCase())));
  const coverage = requiredSkills.length > 0
    ? Math.round(requiredSkills.filter((skill) => coveredSkills.has(skill.toLowerCase())).length / requiredSkills.length * 100)
    : 0;
  const sameUniversityCount = candidates.filter((candidate) => candidate.sameUniversity).length;

  return (
    <aside className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Team board</p>
      <h2 className="mt-2 text-lg font-semibold text-[#17202a]">Composition</h2>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
          <p className="text-xs text-muted-foreground">Skill coverage</p>
          <p className="mt-1 text-2xl font-semibold text-[#17202a]">{coverage}%</p>
        </div>
        <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
          <p className="text-xs text-muted-foreground">Invites sent</p>
          <p className="mt-1 text-2xl font-semibold text-[#17202a]">{invitedCount}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-[#dfe3ea] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
            <Building2 className="size-4 text-[#0c66e4]" />
            Scope
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{scopeLabel[scope]}</p>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
            <Users className="size-4 text-[#0c66e4]" />
            Candidate pool
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{candidates.length} ranked candidates</p>
          <p className="mt-1 text-sm text-muted-foreground">{sameUniversityCount} from same university</p>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#17202a]">Required skills</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {requiredSkills.length === 0 ? (
              <span className="text-sm text-muted-foreground">No skills selected.</span>
            ) : (
              requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className={
                    coveredSkills.has(skill.toLowerCase())
                      ? "rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-medium text-[#1f845a]"
                      : "rounded-md bg-[#eef1f6] px-2 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {skill}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
