import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MatchScope } from "../../services/matchmaker.service";

type ProjectSkillPickerProps = {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  skillInput: string;
  onSkillInputChange: (value: string) => void;
  selectedSkills: string[];
  suggestions: Array<{ name: string; category: string }>;
  scope: MatchScope;
  disabledScopes?: Partial<Record<MatchScope, string>>;
  onScopeChange: (scope: MatchScope) => void;
  onAddSkill: (skill: string) => void;
  onRemoveSkill: (skill: string) => void;
  onFind: () => void;
  loading: boolean;
};

const scopeOptions: Array<{ value: MatchScope; label: string; detail: string }> = [
  { value: "same_department", label: "Same department", detail: "Strictest academic fit" },
  { value: "same_university", label: "Same university", detail: "Best default for student teams" },
  { value: "all_universities", label: "All universities", detail: "Wider talent pool" }
];

export function ProjectSkillPicker({
  projectName,
  onProjectNameChange,
  skillInput,
  onSkillInputChange,
  selectedSkills,
  suggestions,
  scope,
  disabledScopes,
  onScopeChange,
  onAddSkill,
  onRemoveSkill,
  onFind,
  loading
}: ProjectSkillPickerProps) {
  const filteredSuggestions = suggestions
    .filter((skill) => {
      const query = skillInput.trim().toLowerCase();
      if (!query) return false;
      return skill.name.toLowerCase().includes(query) && !selectedSkills.includes(skill.name);
    })
    .slice(0, 6);

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Project requirements</p>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#17202a]">
            Project name
            <Input
              value={projectName}
              onChange={(event) => onProjectNameChange(event.target.value)}
              placeholder="Capstone AI study planner"
              className="mt-2 h-9 border-[#cfd7e3] bg-[#f7f8fa]"
            />
          </label>

          <div>
            <label className="block text-sm font-medium text-[#17202a]">Required skills</label>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={skillInput}
                  onChange={(event) => onSkillInputChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onAddSkill(skillInput);
                    }
                  }}
                  placeholder="React, PostgreSQL, Python..."
                  className="h-9 border-[#cfd7e3] bg-[#f7f8fa] pl-8"
                />
              </div>
              <Button type="button" onClick={() => onAddSkill(skillInput)} className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]">
                <Plus className="size-4" />
                Add
              </Button>
            </div>

            {filteredSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {filteredSuggestions.map((skill) => (
                  <button
                    key={skill.name}
                    type="button"
                    onClick={() => onAddSkill(skill.name)}
                    className="rounded-md border border-[#dfe3ea] bg-white px-2 py-1 text-xs text-muted-foreground hover:border-[#0c66e4]"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex min-h-9 flex-wrap gap-2">
              {selectedSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add at least one required skill to search.</p>
              ) : (
                selectedSkills.map((skill) => (
                  <span key={skill} className="inline-flex items-center gap-1 rounded-md bg-[#eef1f6] px-2.5 py-1 text-sm font-medium text-muted-foreground">
                    {skill}
                    <button type="button" onClick={() => onRemoveSkill(skill)} aria-label={`Remove ${skill}`}>
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-[#17202a]">Matching scope</p>
          {scopeOptions.map((option) => {
            const disabledReason = disabledScopes?.[option.value];
            return (
              <label
                key={option.value}
                title={disabledReason}
                className={`flex gap-2 rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3 ${
                  disabledReason ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#0c66e4]"
                }`}
              >
                <input
                  type="radio"
                  name="match-scope"
                  value={option.value}
                  checked={scope === option.value}
                  disabled={Boolean(disabledReason)}
                  onChange={() => onScopeChange(option.value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#17202a]">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{disabledReason ?? option.detail}</span>
                </span>
              </label>
            );
          })}
          <Button
            type="button"
            onClick={onFind}
            disabled={loading || selectedSkills.length === 0}
            className="mt-2 w-full bg-[#0c66e4] text-white hover:bg-[#0055cc]"
          >
            {loading ? "Finding teammates..." : "Find teammates"}
          </Button>
        </div>
      </div>
    </div>
  );
}
