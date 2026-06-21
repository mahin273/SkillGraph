import { useEffect, useState, useMemo } from "react";
import {
  Play,
  Save,
  Trash2,
  RefreshCw,
  Sparkles,
  History,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Target,
  ArrowRight,
  Plus,
  HelpCircle,
  Clock,
  Layers,
  GraduationCap
} from "lucide-react";
import { getCurrentUser } from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { RoleSelector } from "../components/gps/RoleSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  runSimulation,
  saveSimulation,
  getSimulations,
  deleteSimulation,
  type SimulatedResult,
  type SavedScenario
} from "../services/simulator.service";

export function WhatIfSimulator() {
  const { userId, setUser } = useAuthStore();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [hypotheticalSkills, setHypotheticalSkills] = useState<string[]>([]);
  const [simulationResult, setSimulationResult] = useState<SimulatedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [scenarioName, setScenarioName] = useState("");
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedScenariosForComparison, setSelectedScenariosForComparison] = useState<string[]>([]);
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Ensure user is authenticated
  useEffect(() => {
    if (!userId) {
      getCurrentUser()
        .then(setUser)
        .catch(() => {
          window.location.href = "/login";
        });
    }
  }, [userId, setUser]);

  // Load saved scenarios on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchScenarios();
    }
  }, [userId]);

  const fetchScenarios = async () => {
    if (!userId) return;
    setScenariosLoading(true);
    try {
      const list = await getSimulations(userId);
      setSavedScenarios(list);
    } catch (err) {
      console.error("Failed to fetch scenarios:", err);
    } finally {
      setScenariosLoading(false);
    }
  };

  // Run simulation whenever role or checked skills change
  useEffect(() => {
    if (!userId || !selectedRoleId) {
      setSimulationResult(null);
      if (hypotheticalSkills.length > 0) {
        setHypotheticalSkills([]);
      }
      return;
    }

    const execute = async () => {
      setLoading(true);
      try {
        const result = await runSimulation(userId, selectedRoleId, hypotheticalSkills);
        setSimulationResult(result);
      } catch (err) {
        console.error("Failed to run simulation:", err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      execute();
    }, 150); // slight debounce for interactive selection

    return () => clearTimeout(timer);
  }, [userId, selectedRoleId, hypotheticalSkills]);

  // Get base missing skills when a new role is selected, to build checklist options
  const missingSkillsList = useMemo(() => {
    if (!simulationResult) return [];
    
    // When hypotheticalSkills is empty, simulated.roadmap represents the full missing skills list
    // If they checked some, they are simulated Completed.
    // So the full list of potential hypothetical skills is:
    // simulatedCompletedSkills that are NOT in originalCompletedSkills, PLUS currently missing simulatedSkills.
    // Let's extract them from the response.
    // Wait, original.skillsRemaining can be used if we just list all requirements that the student does not originally have.
    // How do we find that?
    // Let's get the union of remaining simulated roadmap skills AND the skills currently selected in hypotheticalSkills.
    const selectedSet = new Set(hypotheticalSkills);
    const remaining = simulationResult.simulated.roadmap.map(item => ({
      id: item.skillId,
      name: item.skillName,
      category: item.category
    }));
    
    // Create combined list
    const list: Array<{ id: string; name: string; category: string }> = [];
    const seen = new Set<string>();

    // Add selected ones
    // Note: We need their categories, but we might not have them if they're not in the roadmap anymore.
    // We can fetch category from when they were in the roadmap. Let's build a map of id -> category
    for (const skillId of selectedSet) {
      // Find category in original saved paths or fallback
      const foundInOriginalSaved = simulationResult.simulated.roadmap.find(r => r.skillId === skillId);
      list.push({
        id: skillId,
        name: skillId, // Fallback if name is id
        category: foundInOriginalSaved?.category || "Uncategorized"
      });
      seen.add(skillId);
    }

    for (const r of remaining) {
      if (!seen.has(r.id)) {
        list.push(r);
        seen.add(r.id);
      }
    }

    // However, a cleaner way is: we query the full list of missing skills from the very first simulation with []
    // Let's extract the name properly. Since the API returns original completed/missing skills (if original results are returned),
    // Wait! Let's check what the API returns:
    // It returns original: { completionPercentage, estimatedWeeks, skillsCompleted, skillsRemaining }
    // Wait, does it return the full list of original missing skills?
    // Ah! Let's check our simulator.controller.ts:
    // It returns: original: { completionPercentage, estimatedWeeks, skillsCompleted, skillsRemaining }
    // It does not return the list of missing skills!
    // But wait! We can find the missing skills because:
    // Any skill in `simulated.roadmap` is currently missing.
    // Any skill in `hypotheticalSkills` was originally missing but is now simulated as completed.
    // Therefore, the full list of originally missing skills is exactly:
    // `simulated.roadmap` skills + `hypotheticalSkills`!
    // Let's reconstruct it.
    const allOriginallyMissing: Array<{ id: string; name: string; category: string }> = [];
    const idsSeen = new Set<string>();

    // 1. Add current simulated roadmap items
    for (const item of simulationResult.simulated.roadmap) {
      if (!idsSeen.has(item.skillId)) {
        allOriginallyMissing.push({
          id: item.skillId,
          name: item.skillName,
          category: item.category
        });
        idsSeen.add(item.skillId);
      }
    }

    // 2. Add hypothetical skills (originally missing, now simulated complete)
    // To get their actual names and categories, we can look up if we stored them earlier,
    // or if we can extract them from the hypotheticalSkills state.
    // Wait, let's look at `hypotheticalSkills`. We store them by name/id.
    // If the student checks a skill, we add its ID or Name to `hypotheticalSkills`.
    // Let's make sure we check/uncheck using `skill.name`.
    for (const hsName of hypotheticalSkills) {
      // Find name in all originally missing
      if (!idsSeen.has(hsName)) {
        allOriginallyMissing.push({
          id: hsName,
          name: hsName,
          category: "Selected"
        });
        idsSeen.add(hsName);
      }
    }

    return allOriginallyMissing;
  }, [simulationResult, hypotheticalSkills]);

  // Filter missing skills based on search query
  const filteredMissingSkills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return missingSkillsList;
    return missingSkillsList.filter(
      s => s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)
    );
  }, [missingSkillsList, searchQuery]);

  const handleToggleSkill = (skillName: string) => {
    setHypotheticalSkills(prev =>
      prev.includes(skillName)
        ? prev.filter(s => s !== skillName)
        : [...prev, skillName]
    );
  };

  const handleClearAll = () => {
    setHypotheticalSkills([]);
  };

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoleId || !simulationResult || !scenarioName.trim()) return;

    setSaving(true);
    setSaveStatus(null);
    try {
      await saveSimulation({
        scenarioName: scenarioName.trim(),
        targetRoleId: selectedRoleId,
        hypotheticalSkills,
        simulatedResult: simulationResult.simulated,
        completionDelta: simulationResult.simulated.completionDelta,
        weeksSaved: simulationResult.simulated.weeksSaved
      });
      setSaveStatus("Scenario saved successfully!");
      setScenarioName("");
      fetchScenarios();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus("Failed to save scenario.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    setSelectedRoleId(scenario.targetRoleId);
    setHypotheticalSkills(scenario.hypotheticalSkills);
  };

  const handleDeleteScenario = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this scenario?")) return;

    try {
      await deleteSimulation(id);
      // Remove from comparison if deleted
      setSelectedScenariosForComparison(prev => prev.filter(x => x !== id));
      fetchScenarios();
    } catch (err) {
      console.error("Failed to delete scenario:", err);
    }
  };

  const handleToggleCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedScenariosForComparison(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };


  return (
    <section className="mx-auto grid w-full max-w-[1400px] gap-6 pb-20 lg:pb-4">
      {/* Premium Header */}
      <header className="relative overflow-hidden rounded-2xl border border-[#dfe3ea] bg-gradient-to-r from-white via-[#fcfdff] to-[#f4f7fc] px-6 py-5 shadow-sm">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/40 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Simulate & Plan</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17202a]">What-If Path Simulator</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Explore how future coursework, certifications, or self-study electives will impact your career readiness roadmap. Add hypothetical skills to see estimated weeks saved in real-time.
        </p>
      </header>

      {/* Role Selection Bar */}
      <div className="rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm">
        <RoleSelector value={selectedRoleId} onChange={(roleId) => {
          setSelectedRoleId(roleId);
          setHypotheticalSkills([]);
        }} />
      </div>

      {selectedRoleId ? (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left Column: Skill Selector Checklist */}
          <div className="space-y-6">
            <Card className="shadow-sm border-[#dfe3ea] overflow-hidden">
              <CardHeader className="bg-slate-50 border-b border-[#dfe3ea] py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-[#17202a]">Skills to Assume Complete</CardTitle>
                    <CardDescription className="text-xs">Check skills to simulate acquisition</CardDescription>
                  </div>
                  {hypotheticalSkills.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleClearAll}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-red-600 hover:bg-red-50"
                    >
                      Clear ({hypotheticalSkills.length})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Input
                    placeholder="Search missing skills..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-sm"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <HelpCircle className="size-4" />
                  </div>
                </div>

                {/* Checklist Container */}
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                  {filteredMissingSkills.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      {searchQuery ? "No matching skills found." : "No missing skills for this role."}
                    </div>
                  ) : (
                    filteredMissingSkills.map((skill) => {
                      const isChecked = hypotheticalSkills.includes(skill.name);
                      return (
                        <div
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill.name)}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            isChecked
                              ? "bg-blue-50/50 border-blue-200 shadow-sm"
                              : "bg-white border-[#dfe3ea] hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by div onClick
                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 leading-none">{skill.name}</p>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                                {skill.category || "General"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Saved Scenarios Card */}
            <Card className="shadow-sm border-[#dfe3ea]">
              <CardHeader className="py-4 border-b border-[#dfe3ea]">
                <div className="flex items-center gap-2">
                  <History className="size-4 text-blue-600" />
                  <CardTitle className="text-base font-bold text-[#17202a]">Saved Simulations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {scenariosLoading ? (
                  <div className="py-6 text-center text-sm text-slate-400">Loading simulations...</div>
                ) : savedScenarios.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-400 leading-normal">
                    No scenarios saved yet. Run a simulation and save it above.
                  </div>
                ) : (
                  <div className="space-y-3 pr-1">
                    <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                      {savedScenarios.map((scenario) => {
                        const isCompareSelected = selectedScenariosForComparison.includes(scenario.id);
                        return (
                          <div
                            key={scenario.id}
                            onClick={() => handleLoadScenario(scenario)}
                            className={`group flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                              isCompareSelected
                                ? "border-blue-500 bg-blue-50/20 shadow-sm"
                                : "border-[#dfe3ea] bg-white hover:border-blue-400 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={isCompareSelected}
                                  onClick={(e) => handleToggleCompare(scenario.id, e)}
                                  onChange={() => {}}
                                  className="mt-1 size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                                <h4 className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600">
                                  {scenario.scenarioName}
                                </h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteScenario(scenario.id, e)}
                                className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-1 shrink-0"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 pl-5.5">
                              Target: {scenario.targetRole?.title || "Role"}
                            </p>
                            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-50 pt-2 text-[11px] pl-5.5">
                              <span className="font-semibold text-emerald-600">
                                +{scenario.completionDelta}% Match
                              </span>
                              <span className="font-semibold text-blue-600">
                                {scenario.weeksSaved} weeks saved
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedScenariosForComparison.length >= 2 && (
                      <Button
                        onClick={() => setShowComparisonModal(true)}
                        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <TrendingUp className="size-3.5" />
                        Compare Selected ({selectedScenariosForComparison.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Comparison Dashboard & Roadmap */}
          <div className="space-y-6">
            {loading && !simulationResult ? (
              <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-[#dfe3ea] bg-white p-8">
                <RefreshCw className="size-8 animate-spin text-blue-600" />
                <p className="mt-4 text-sm font-medium text-slate-600">Analyzing skills & calculating optimal roadmap...</p>
              </div>
            ) : simulationResult ? (
              <>
                {/* Visual Impact Dashboard */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Progress Completion Impact */}
                  <div className="relative overflow-hidden rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm">
                    {loading && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <RefreshCw className="size-5 animate-spin text-blue-600" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role Completion Rate</p>
                      <Target className="size-4 text-blue-500" />
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-800 tracking-tight">
                        {simulationResult.simulated.completionPercentage}%
                      </span>
                      {simulationResult.simulated.completionDelta > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100">
                          +{simulationResult.simulated.completionDelta}% increase
                        </span>
                      )}
                    </div>

                    {/* Comparative Progress Bar */}
                    <div className="mt-5 space-y-2">
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden relative">
                        {/* Original Progress */}
                        <div
                          className="absolute inset-y-0 left-0 bg-slate-400 transition-all duration-500"
                          style={{ width: `${simulationResult.original.completionPercentage}%` }}
                        />
                        {/* Simulated Progress */}
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 opacity-80"
                          style={{ width: `${simulationResult.simulated.completionPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Original: {simulationResult.original.completionPercentage}%</span>
                        <span>Simulated Goal: {simulationResult.simulated.completionPercentage}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Time Saved Impact */}
                  <div className="relative overflow-hidden rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm">
                    {loading && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-[1px]">
                        <RefreshCw className="size-5 animate-spin text-blue-600" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated Roadmap Duration</p>
                      <Clock className="size-4 text-emerald-500" />
                    </div>

                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-4xl font-extrabold text-slate-800 tracking-tight">
                        {simulationResult.simulated.estimatedWeeks}
                      </span>
                      <span className="text-base font-semibold text-slate-500">weeks remaining</span>
                    </div>

                    {/* Estimated Weeks Comparative display */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current path</p>
                        <p className="text-sm font-semibold text-slate-600">{simulationResult.original.estimatedWeeks} weeks</p>
                      </div>
                      {simulationResult.simulated.weeksSaved > 0 ? (
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">🔥 Simulated Impact</p>
                          <p className="text-sm font-extrabold text-emerald-600">
                            Saved {simulationResult.simulated.weeksSaved} weeks!
                          </p>
                        </div>
                      ) : (
                        <div className="text-right text-slate-400 text-xs italic">
                          Check skills on left to save time
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scenario Persistence Panel */}
                <Card className="shadow-sm border-[#dfe3ea]">
                  <CardHeader className="py-4 border-b border-[#dfe3ea]">
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Save className="size-4 text-blue-600" />
                      Save Simulation Scenario
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <form onSubmit={handleSaveScenario} className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="e.g. Taken Advanced DB Course, Summer Web Development elective"
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        className="flex-1 text-sm h-10"
                        required
                        disabled={saving}
                      />
                      <Button
                        type="submit"
                        disabled={saving || !scenarioName.trim()}
                        className="h-10 px-5 bg-blue-600 text-white font-semibold hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
                      >
                        {saving ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          <Plus className="size-4" />
                        )}
                        Save Scenario
                      </Button>
                    </form>
                    {saveStatus && (
                      <p className={`mt-2 text-xs font-semibold ${
                        saveStatus.includes("success") ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {saveStatus}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Simulated Path Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-[#17202a] flex items-center gap-2">
                      <Layers className="size-4 text-blue-600" />
                      Simulated Remaining Roadmap
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-slate-100">
                      {simulationResult.simulated.roadmap.length} skills left to learn
                    </span>
                  </div>

                  <div className="space-y-4 relative">
                    {simulationResult.simulated.roadmap.length === 0 ? (
                      <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-8 text-center">
                        <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
                        <h4 className="mt-3 text-lg font-bold text-emerald-800">Target Role Fulfilled!</h4>
                        <p className="mt-1.5 text-sm text-emerald-700 max-w-md mx-auto">
                          Assuming you acquire the selected skills, your profile matches 100% of the target role requirements.
                        </p>
                      </div>
                    ) : (
                      simulationResult.simulated.roadmap.map((item, index) => (
                        <div key={item.skillId} className="relative flex gap-4">
                          {/* Left Line Connector */}
                          {index < simulationResult.simulated.roadmap.length - 1 && (
                            <div className="absolute left-[15px] top-[32px] h-[calc(100%-8px)] w-0.5 bg-slate-200" />
                          )}

                          {/* Node Icon */}
                          <div className="relative z-10 flex size-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white shadow-sm">
                            <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                          </div>

                          {/* Node Box */}
                          <div className="flex-1 rounded-xl border border-[#dfe3ea] bg-white p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-sm font-bold text-slate-800">{item.skillName}</h4>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                                    {item.category}
                                  </span>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                  {item.objective || `Complete this course module to clear the ${item.skillName} requirements.`}
                                </p>
                              </div>
                              <div className="flex items-center gap-4 sm:flex-col sm:items-end text-left sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-50">
                                <div>
                                  <p className="text-[9px] uppercase font-bold text-slate-400">Duration</p>
                                  <p className="text-xs font-bold text-slate-700">{item.estimatedWeeks} weeks</p>
                                </div>
                                <div className="sm:mt-1">
                                  <p className="text-[9px] uppercase font-bold text-slate-400">Difficulty</p>
                                  <p className="text-xs font-bold text-slate-700">{item.difficulty}/5</p>
                                </div>
                              </div>
                            </div>

                            {/* Recommended Courses mini section */}
                            {item.resources && item.resources.length > 0 && (
                              <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                  <BookOpen className="size-3.5 text-blue-500" />
                                  Top Learning Resources ({item.resources.length})
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {item.resources.slice(0, 2).map((res, rIdx) => (
                                    <a
                                      key={res.id || rIdx}
                                      href={res.url || "#"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between p-2 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-200 transition-all text-xs"
                                    >
                                      <div className="min-w-0 flex-1 pr-2">
                                        <p className="font-semibold text-slate-700 truncate">{res.title}</p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                          {res.provider || "Web"} • {res.type}
                                        </p>
                                      </div>
                                      <ArrowRight className="size-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#dfe3ea] bg-white p-12 text-center shadow-sm min-h-80">
          <GraduationCap className="size-12 text-blue-500 opacity-60" />
          <h3 className="mt-4 text-base font-bold text-[#17202a]">No Role Selected</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            Select a target role from the dropdown above to calculate your current path gap and start the simulation.
          </p>
        </div>
      )}

      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-full max-h-[80vh] w-full max-w-5xl flex-col rounded-xl border border-[#dfe3ea] bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#edf0f5] px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#17202a] flex items-center gap-2">
                  <TrendingUp className="size-5 text-blue-600" />
                  Simulation Comparison Dashboard
                </h3>
                <p className="text-xs text-muted-foreground">Side-by-side analysis of your simulated academic career pathways.</p>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-[#edf0f5] hover:text-[#17202a]"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body: Comparison Table */}
            <div className="flex-1 overflow-auto p-6">
              <div className="min-w-[800px]">
                <table className="w-full border-collapse border border-[#dfe3ea] text-left text-sm text-[#17202a]">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-[#dfe3ea] p-3 font-semibold text-slate-600 w-1/4">Metric / Dimension</th>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        return (
                          <th key={id} className="border border-[#dfe3ea] p-3 font-bold text-blue-600 w-1/4">
                            {scenario?.scenarioName || "Scenario"}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Target Job Role</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3 font-semibold text-slate-800">
                            {scenario?.targetRole?.title || "N/A"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Simulated Match %</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        const match = scenario?.simulatedResult?.completionPercentage ?? 0;
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-800">{match}%</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden max-w-[100px]">
                                <div className="h-full bg-emerald-500 rounded" style={{ width: `${match}%` }} />
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Match Increase (Delta)</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        const delta = scenario?.completionDelta ?? 0;
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3 text-emerald-600 font-extrabold">
                            +{delta}%
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Estimated Path Length</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3 font-semibold text-slate-700">
                            {scenario?.simulatedResult?.estimatedWeeks ?? 0} weeks
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Weeks Saved</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3">
                            <span className="rounded bg-blue-50 border border-blue-100 px-2 py-1 text-xs font-bold text-blue-600">
                              {scenario?.weeksSaved ?? 0} weeks saved
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-[#dfe3ea] p-3 font-bold bg-slate-50/50">Hypothetical Skills Added</td>
                      {selectedScenariosForComparison.map((id) => {
                        const scenario = savedScenarios.find((s) => s.id === id);
                        const skills = scenario?.hypotheticalSkills || [];
                        return (
                          <td key={id} className="border border-[#dfe3ea] p-3">
                            {skills.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">None</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {skills.map((s, idx) => (
                                  <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0.5 bg-blue-50/30 text-blue-700 border-blue-100">
                                    {s}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-[#edf0f5] px-6 py-4 flex justify-end">
              <Button
                onClick={() => setShowComparisonModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4"
              >
                Close Comparison
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

