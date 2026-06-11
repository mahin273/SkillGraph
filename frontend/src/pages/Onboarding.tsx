import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Github,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Award,
  AlertCircle,
  Plus,
  Trash2,
  GraduationCap
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { triggerIngestion, getIngestionStatus, getStudentSkills } from "../services/graph.service";
import { getRoles, getCareerGPS, saveCareerGPS } from "../services/careerGps.service";
import { GitHubConnectButton } from "../components/auth/GitHubConnectButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
  requiredSkills: Array<{ name: string; criticality: number }>;
};

export function Onboarding() {
  const navigate = useNavigate();
  const { userId, githubConnected, githubHandle } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2 Ingestion States
  const [ingestionStatus, setIngestionStatus] = useState<string>("not_started");
  const [skillsFoundCount, setSkillsFoundCount] = useState(0);

  // Step 3 Skills Verification States
  const [detectedSkills, setDetectedSkills] = useState<Array<{ name: string; confidence: number }>>([]);
  const [newSkillName, setNewSkillName] = useState("");

  // Step 4 Target Role States
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // Fetch roles on load
  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch((err) => console.error("Failed to load industry roles:", err));
  }, []);

  // Poll Ingestion Status
  useEffect(() => {
    if (step !== 2 || !userId) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const poll = async () => {
      try {
        const status = await getIngestionStatus(userId);
        if (cancelled) return;

        setIngestionStatus(status.status);
        setSkillsFoundCount(status.skillsFound ?? 0);

        if (status.status === "queued" || status.status === "processing") {
          timeoutId = setTimeout(poll, 2000);
        } else if (status.status === "completed") {
          // Ingestion done, load skills and move to step 3
          await loadSkills();
          setStep(3);
        } else if (status.status === "failed") {
          setError(status.error || "GitHub scan failed. Please try again.");
          setStep(1);
        }
      } catch (err) {
        console.error("Error polling ingestion:", err);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, userId]);

  const startGithubScan = async () => {
    setError(null);
    setLoading(true);
    try {
      await triggerIngestion();
      setIngestionStatus("queued");
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to start GitHub repository scanning.");
    } finally {
      setLoading(false);
    }
  };

  const loadSkills = async () => {
    if (!userId) return;
    try {
      const result = await getStudentSkills(userId);
      const skills = Array.isArray(result) ? result : (result as any)?.skills || [];
      setDetectedSkills(skills.map((s: any) => ({ name: s.name, confidence: s.confidence || 0.65 })));
    } catch (err) {
      console.error("Failed to fetch skills:", err);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) return;
    if (detectedSkills.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewSkillName("");
      return;
    }
    setDetectedSkills([...detectedSkills, { name: trimmed, confidence: 0.8 }]);
    setNewSkillName("");
  };

  const handleRemoveSkill = (name: string) => {
    setDetectedSkills(detectedSkills.filter((s) => s.name !== name));
  };

  const handleSelectRole = async (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const handleFinishOnboarding = async () => {
    if (!userId || !selectedRoleId) return;
    setLoading(true);
    try {
      // Calculate and save the career GPS path
      const gpsData = await getCareerGPS(userId, selectedRoleId);
      await saveCareerGPS({
        studentId: userId,
        targetRoleId: selectedRoleId,
        completionPercentage: gpsData.completionPercentage,
        estimatedWeeks: gpsData.estimatedWeeks,
        missingSkills: gpsData.missingSkills,
        roadmap: gpsData.roadmap
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || "Failed to finalize career path mapping.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center justify-center px-4 py-16">
      {/* Onboarding Stepper Header */}
      <div className="mb-10 flex w-full justify-between border-b border-[#dfe3ea] pb-6">
        {[
          { label: "Connect Profile", s: 1 },
          { label: "AI Scan", s: 2 },
          { label: "Verify Skills", s: 3 },
          { label: "Target Path", s: 4 }
        ].map((item) => (
          <div key={item.s} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                step === item.s
                  ? "bg-[#0c66e4] text-white"
                  : step > item.s
                  ? "bg-[#1f845a] text-white"
                  : "bg-[#f7f8fa] text-muted-foreground border border-[#cfd7e3]"
              }`}
            >
              {step > item.s ? "✓" : item.s}
            </span>
            <span
              className={`text-sm hidden sm:inline ${
                step === item.s ? "font-semibold text-[#17202a]" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 flex w-full items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm animate-in fade-in">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
          <div>
            <h4 className="font-semibold">Setup Error</h4>
            <p className="mt-1 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Connect profile & GitHub */}
      {step === 1 && (
        <Card className="w-full border-[#dfe3ea] bg-white shadow-lg animate-in fade-in">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#e9f2ff] text-[#0c66e4]">
              <GraduationCap className="size-6" />
            </div>
            <CardTitle className="text-2xl font-bold text-[#17202a]">
              Welcome to SkillGraph!
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Let's set up your profile to map your skills from academia to industry expectations.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="rounded-lg border border-[#edf0f5] p-5">
              <h3 className="flex items-center gap-2 font-semibold text-[#17202a]">
                <Github className="size-5" />
                Connect your GitHub Account
              </h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                SkillGraph uses LLMs to extract languages, frameworks, and packages from your code commits and README files.
              </p>
              
              <div className="mt-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                {githubConnected ? (
                  <div className="flex items-center gap-2 rounded-md bg-[#e7f8ef] px-3 py-2 text-sm font-semibold text-[#1f845a]">
                    <CheckCircle2 className="size-4" />
                    Connected as {githubHandle}
                  </div>
                ) : (
                  <div className="w-full sm:w-56">
                    <GitHubConnectButton label="Link GitHub Account" link />
                  </div>
                )}

                <Button
                  onClick={githubConnected ? startGithubScan : () => setStep(3)}
                  disabled={loading}
                  className="w-full sm:w-auto gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                >
                  {githubConnected ? "Start AI Repositories Scan" : "Skip & Enter Skills Manually"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Ingestion & NLP scanning progress */}
      {step === 2 && (
        <Card className="w-full border-[#dfe3ea] bg-white shadow-lg animate-in fade-in">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="relative mb-6">
              <div className="size-16 rounded-full border-4 border-[#e9f2ff] border-t-[#0c66e4] animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="size-6 text-[#0c66e4]" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#17202a]">AI Code Analysis in Progress</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-md leading-relaxed">
              We are normalizing repository texts, extracting features using LLMs, and matching them with industry skill graph nodes.
            </p>
            <div className="mt-6 rounded-md bg-[#f7f8fa] border border-[#cfd7e3] px-6 py-3 font-semibold text-[#17202a]">
              Status: <span className="capitalize text-[#0c66e4]">{ingestionStatus.replace("_", " ")}</span>
              {skillsFoundCount > 0 && (
                <span className="ml-4 pl-4 border-l border-[#cfd7e3] text-[#1f845a]">
                  {skillsFoundCount} Skills Discovered
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Verify and Edit Skills */}
      {step === 3 && (
        <Card className="w-full border-[#dfe3ea] bg-white shadow-lg animate-in fade-in">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-[#17202a]">Verify Your Extracted Skills</CardTitle>
            <p className="text-sm text-muted-foreground mt-1.5">
              Below are the skills identified by the AI. Add any missing skills or remove incorrect ones.
            </p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Add skill (e.g. React, Docker, Python)"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                className="border-[#cfd7e3] focus:border-[#0c66e4]"
              />
              <Button onClick={handleAddSkill} className="bg-[#0c66e4] text-white hover:bg-[#0055cc]">
                <Plus className="size-4" />
              </Button>
            </div>

            <div className="min-h-[200px] rounded-lg border border-[#edf0f5] bg-[#fbfcfe] p-4">
              {detectedSkills.length === 0 ? (
                <div className="flex h-[180px] flex-col items-center justify-center text-center text-muted-foreground">
                  <AlertCircle className="size-8 text-[#a8b3c7] mb-2" />
                  <p className="text-sm font-semibold">No skills logged yet</p>
                  <p className="text-xs text-[#a8b3c7] mt-1">Use the search bar above to manually log your skills.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {detectedSkills.map((skill) => (
                    <div
                      key={skill.name}
                      className="flex items-center justify-between rounded-lg border border-[#dfe3ea] bg-white px-3 py-2 shadow-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-[#17202a]">{skill.name}</p>
                        <p className="text-[10px] text-muted-foreground">{(skill.confidence * 100).toFixed(0)}% Match</p>
                      </div>
                      <button
                        onClick={() => handleRemoveSkill(skill.name)}
                        className="text-[#a8b3c7] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#edf0f5]">
              <Button
                onClick={() => setStep(4)}
                className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
              >
                Proceed to Target Path
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 4: Choose Target Role / Career Path */}
      {step === 4 && (
        <div className="w-full space-y-6 animate-in fade-in">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-[#17202a]">Select Your Target Career Goal</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Which professional role are you aiming to transition to from your university studies?
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {roles.map((role) => (
              <Card
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={`cursor-pointer border transition-all hover:shadow-md ${
                  selectedRoleId === role.id
                    ? "border-[#0c66e4] bg-[#f3f8ff] ring-2 ring-[#0c66e4]/20"
                    : "border-[#dfe3ea] bg-white"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-bold text-[#17202a]">
                    {role.name}
                  </CardTitle>
                  <TrendingUp
                    className={`size-5 ${
                      selectedRoleId === role.id ? "text-[#0c66e4]" : "text-[#a8b3c7]"
                    }`}
                  />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {role.description || "Learn and develop industry-recommended competencies for this technical position."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {role.requiredSkills.slice(0, 3).map((rs) => (
                      <span
                        key={rs.name}
                        className="rounded bg-[#f7f8fa] border border-[#cfd7e3] px-1.5 py-0.5 text-[9px] font-semibold text-[#17202a]"
                      >
                        {rs.name}
                      </span>
                    ))}
                    {role.requiredSkills.length > 3 && (
                      <span className="px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        +{role.requiredSkills.length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-between pt-6 border-t border-[#dfe3ea]">
            <Button
              variant="outline"
              onClick={() => setStep(3)}
              className="border-[#cfd7e3] text-[#17202a] hover:bg-[#f7f8fa]"
            >
              Back
            </Button>
            <Button
              onClick={handleFinishOnboarding}
              disabled={loading || !selectedRoleId}
              className="gap-2 bg-[#1f845a] text-white hover:bg-[#166544]"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Mapping Path...
                </>
              ) : (
                <>
                  <Award className="size-4" />
                  Map My Career GPS!
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
