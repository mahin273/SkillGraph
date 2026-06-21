import { CheckCircle2, GraduationCap, Send, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MatchmakerCandidate } from "../../services/matchmaker.service";

type CandidateCardProps = {
  candidate: MatchmakerCandidate;
  onInvite: (candidate: MatchmakerCandidate) => void;
  inviting: boolean;
  invited: boolean;
};

function getFitLabel(score: number) {
  if (score >= 80) return "Strong fit";
  if (score >= 60) return "Good fit";
  return "Possible fit";
}

export function CandidateCard({ candidate, onInvite, inviting, invited }: CandidateCardProps) {
  return (
    <article className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#e7f8ef] px-2 py-1 text-xs font-medium text-[#1f845a]">
              {getFitLabel(candidate.matchScore)}
            </span>
            {candidate.sameDepartment && (
              <span className="rounded-md bg-[#e9f2ff] px-2 py-1 text-xs font-medium text-[#0c66e4]">Same department</span>
            )}
            {!candidate.sameDepartment && candidate.sameUniversity && (
              <span className="rounded-md bg-[#e9f2ff] px-2 py-1 text-xs font-medium text-[#0c66e4]">Same university</span>
            )}
            {!candidate.sameUniversity && (
              <span className="rounded-md bg-[#fff4e5] px-2 py-1 text-xs font-medium text-[#974f0c]">Cross-university</span>
            )}
          </div>

          <h3 className="mt-3 text-lg font-semibold text-[#17202a]">{candidate.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <GraduationCap className="size-4" />
              {candidate.university}
            </span>
            <span>{candidate.department}</span>
            {candidate.graduationYear && <span>Class of {candidate.graduationYear}</span>}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
              <p className="text-xs font-medium text-muted-foreground">Match score</p>
              <p className="mt-1 text-2xl font-semibold text-[#17202a]">{candidate.matchScore}%</p>
            </div>
            <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
              <p className="text-xs font-medium text-muted-foreground">Evidence</p>
              <p className="mt-1 text-sm font-semibold text-[#17202a]">
                {candidate.evidence.repoSignalCount} repos, {candidate.evidence.endorsementCount} endorsements
              </p>
            </div>
            <div className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
              <p className="text-xs font-medium text-muted-foreground">Confidence</p>
              <p className="mt-1 text-sm font-semibold text-[#17202a]">
                {Math.round(candidate.evidence.avgConfidence * 100)}%
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                <CheckCircle2 className="size-4 text-[#1f845a]" />
                Matched skills
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidate.matchedSkills.map((skill) => (
                  <span key={skill.name} className="rounded-md bg-[#eef1f6] px-2 py-1 text-xs font-medium text-muted-foreground">
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
                <XCircle className="size-4 text-[#974f0c]" />
                Missing skills
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {candidate.missingSkills.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Covers every required skill.</span>
                ) : (
                  candidate.missingSkills.map((skill) => (
                    <span key={skill} className="rounded-md bg-[#fff4e5] px-2 py-1 text-xs font-medium text-[#974f0c]">
                      {skill}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#17202a]">
              <ShieldCheck className="size-4 text-[#0c66e4]" />
              Why this match
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {candidate.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => onInvite(candidate)}
          disabled={inviting || invited}
          className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc] lg:w-36"
        >
          <Send className="size-4" />
          {invited ? "Invited" : inviting ? "Sending..." : "Invite"}
        </Button>
      </div>
    </article>
  );
}
