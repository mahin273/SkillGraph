import { useEffect, useState } from "react";
import { Network, RefreshCw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { CandidateCard } from "../components/matchmaker/CandidateCard";
import { ProjectSkillPicker } from "../components/matchmaker/ProjectSkillPicker";
import { TeamCompositionPanel } from "../components/matchmaker/TeamCompositionPanel";
import { useMatchmaker } from "../hooks/useMatchmaker";
import { getCurrentUser, type AcademicProfile } from "../services/auth.service";
import { getAllSkills, type MatchScope, type MatchmakerCandidate } from "../services/matchmaker.service";
import { Button } from "@/components/ui/button";

export function Matchmaker() {
  const [projectName, setProjectName] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React", "TypeScript", "PostgreSQL"]);
  const [scope, setScope] = useState<MatchScope>("same_university");
  const [skillSuggestions, setSkillSuggestions] = useState<Array<{ name: string; category: string }>>([]);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent">>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null);
  const { candidates, loading, error, findCandidates, invite } = useMatchmaker();

  useEffect(() => {
    getAllSkills()
      .then(setSkillSuggestions)
      .catch(() => setSkillSuggestions([]));
  }, []);

  useEffect(() => {
    void getCurrentUser()
      .then((currentUser) => setAcademicProfile(currentUser.academicProfile ?? null))
      .catch(() => setAcademicProfile(null));
  }, []);

  useEffect(() => {
    if (scope === "same_university" && !academicProfile?.universityId) {
      setScope("all_universities");
    }
    if (scope === "same_department" && !academicProfile?.departmentId) {
      setScope(academicProfile?.universityId ? "same_university" : "all_universities");
    }
  }, [academicProfile, scope]);

  const addSkill = (skill: string) => {
    const normalized = skill.trim();
    if (!normalized) return;

    setSelectedSkills((current) => (
      current.some((item) => item.toLowerCase() === normalized.toLowerCase())
        ? current
        : [...current, normalized]
    ));
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills((current) => current.filter((item) => item !== skill));
  };

  const handleFind = () => {
    if (scope === "same_university" && !academicProfile?.universityId) {
      setStatusMessage("Add your university in Settings before using same-university matching.");
      return;
    }
    if (scope === "same_department" && !academicProfile?.departmentId) {
      setStatusMessage("Add your department in Settings before using same-department matching.");
      return;
    }
    setStatusMessage(null);
    void findCandidates({ requiredSkills: selectedSkills, scope });
  };

  const disabledScopes: Partial<Record<MatchScope, string>> = {
    ...(!academicProfile?.departmentId ? { same_department: "Add your department in Settings first" } : {}),
    ...(!academicProfile?.universityId ? { same_university: "Add your university in Settings first" } : {})
  };

  const handleInvite = async (candidate: MatchmakerCandidate) => {
    const fallbackProjectName = selectedSkills.length > 0
      ? `${selectedSkills.slice(0, 2).join(" + ")} team`
      : "SkillGraph project team";

    setInviteStatus((current) => ({ ...current, [candidate.studentId]: "sending" }));
    setStatusMessage(null);

    try {
      await invite({
        candidateId: candidate.studentId,
        projectName: projectName.trim() || fallbackProjectName,
        requiredSkills: selectedSkills,
        message: `You matched this project for ${selectedSkills.join(", ")}.`
      });
      setInviteStatus((current) => ({ ...current, [candidate.studentId]: "sent" }));
      setStatusMessage(`Invitation sent to ${candidate.name}.`);
    } catch (err) {
      setInviteStatus((current) => {
        const next = { ...current };
        delete next[candidate.studentId];
        return next;
      });
      setStatusMessage(err instanceof Error ? err.message : "Failed to send invitation.");
    }
  };

  return (
    <section className="mx-auto grid w-full max-w-[1500px] gap-4 pb-20 lg:pb-4">
      <header className="flex flex-col gap-3 rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Network className="size-3.5 text-[#0c66e4]" />
            University-aware matching
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#17202a]">Build a balanced team</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rank students by skill fit, evidence, endorsements, and academic proximity.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleFind}
          disabled={loading || selectedSkills.length === 0}
          className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
        >
          {loading ? <RefreshCw className="size-4 animate-spin" /> : <Users className="size-4" />}
          {loading ? "Matching..." : "Run match"}
        </Button>
      </header>

      {(error || statusMessage) && (
        <div className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 text-sm text-[#17202a] shadow-sm">
          {error || statusMessage}
        </div>
      )}

      {!academicProfile?.universityId && (
        <div className="rounded-lg border border-[#dfe3ea] bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          Same-university matching needs your academic profile.{" "}
          <Link to="/settings" className="font-medium text-[#0c66e4]">
            Add university
          </Link>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <ProjectSkillPicker
            projectName={projectName}
            onProjectNameChange={setProjectName}
            skillInput={skillInput}
            onSkillInputChange={setSkillInput}
            selectedSkills={selectedSkills}
            suggestions={skillSuggestions}
            scope={scope}
            disabledScopes={disabledScopes}
            onScopeChange={setScope}
            onAddSkill={addSkill}
            onRemoveSkill={removeSkill}
            onFind={handleFind}
            loading={loading}
          />

          {loading && (
            <div className="rounded-lg border border-[#dfe3ea] bg-white p-8 text-center shadow-sm">
              <RefreshCw className="mx-auto size-5 animate-spin text-[#0c66e4]" />
              <p className="mt-3 text-sm text-muted-foreground">Ranking candidates...</p>
            </div>
          )}

          {!loading && candidates.length === 0 && (
            <div className="rounded-lg border border-[#dfe3ea] bg-white p-8 text-center shadow-sm">
              <Users className="mx-auto size-10 text-[#0c66e4]" />
              <h2 className="mt-4 text-lg font-semibold text-[#17202a]">No candidates loaded</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add required skills and run matching. If results are empty, widen the scope or scan more student repositories.
              </p>
            </div>
          )}

          {!loading && candidates.map((candidate) => (
            <CandidateCard
              key={candidate.studentId}
              candidate={candidate}
              onInvite={handleInvite}
              inviting={inviteStatus[candidate.studentId] === "sending"}
              invited={inviteStatus[candidate.studentId] === "sent"}
            />
          ))}
        </div>

        <TeamCompositionPanel
          requiredSkills={selectedSkills}
          candidates={candidates}
          scope={scope}
          invitedCount={Object.values(inviteStatus).filter((status) => status === "sent").length}
        />
      </div>
    </section>
  );
}
