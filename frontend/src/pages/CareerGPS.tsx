import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Download,
  History,
  RefreshCw,
  Route,
  Save,
  Search,
  Target,
  TrendingUp
} from "lucide-react";
import { getCurrentUser } from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { useCareerGPS } from "../hooks/useCareerGPS";
import { getCareerGPSHistory, type CareerGPSHistoryItem } from "../services/careerGps.service";
import { getCompletedResources, completeResource } from "../services/resources.service";
import { RoleSelector } from "../components/gps/RoleSelector";
import { GPSProgressRing } from "../components/gps/GPSProgressRing";
import { CompletedSkillBadge } from "../components/gps/CompletedSkillBadge";
import { MissingSkillCard } from "../components/gps/MissingSkillCard";
import { SkillRoadmapTimeline } from "../components/gps/SkillRoadmapTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MissingSort = "priority" | "difficulty" | "name";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function CareerGPS() {
  const { userId, setUser } = useAuthStore();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  const [missingSort, setMissingSort] = useState<MissingSort>("priority");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [history, setHistory] = useState<CareerGPSHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [completedResourcesMap, setCompletedResourcesMap] = useState<Record<string, boolean>>({});
  const { data, loading, error, save } = useCareerGPS({
    studentId: userId ?? null,
    targetRoleId: selectedRoleId
  });

  useEffect(() => {
    if (!userId) return;

    getCompletedResources(userId)
      .then((resources) => {
        const map: Record<string, boolean> = {};
        for (const item of resources) {
          map[item.id] = true;
        }
        setCompletedResourcesMap(map);
      })
      .catch((err) => console.error("Failed to load completed resources:", err));
  }, [userId]);

  const handleToggleResourceComplete = async (resourceId: string) => {
    const wasCompleted = !!completedResourcesMap[resourceId];
    try {
      setCompletedResourcesMap((prev) => ({
        ...prev,
        [resourceId]: !wasCompleted
      }));
      await completeResource(resourceId, !wasCompleted);
    } catch (err) {
      console.error("Failed to toggle resource completion:", err);
      setCompletedResourcesMap((prev) => ({
        ...prev,
        [resourceId]: wasCompleted
      }));
    }
  };

  useEffect(() => {
    if (userId) return;

    void getCurrentUser()
      .then(setUser)
      .catch(() => {
        window.location.href = "/login";
      });
  }, [setUser, userId]);

  useEffect(() => {
    if (!userId) return;

    setHistoryLoading(true);
    getCareerGPSHistory(userId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [userId, saveStatus]);

  const filteredCompletedSkills = useMemo(() => {
    if (!data) return [];
    const query = skillQuery.trim().toLowerCase();
    return data.completedSkills.filter((skill) => {
      if (!query) return true;
      return `${skill.name} ${skill.category}`.toLowerCase().includes(query);
    });
  }, [data, skillQuery]);

  const filteredMissingSkills = useMemo(() => {
    if (!data) return [];
    const query = skillQuery.trim().toLowerCase();
    const skills = data.missingSkills.filter((skill) => {
      if (!query) return true;
      return `${skill.name} ${skill.category}`.toLowerCase().includes(query);
    });

    return [...skills].sort((a, b) => {
      if (missingSort === "difficulty") {
        return (b.learningDifficulty ?? 0) - (a.learningDifficulty ?? 0);
      }

      if (missingSort === "name") {
        return a.name.localeCompare(b.name);
      }

      return (b.learningDifficulty ?? 0) - (a.learningDifficulty ?? 0);
    });
  }, [data, missingSort, skillQuery]);

  const roadmapWeeks = data?.roadmap.reduce((total, item) => total + item.estimatedWeeks, 0) ?? 0;

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);

    try {
      await save();
      setSaveStatus("Career path saved.");
    } catch (err) {
      setSaveStatus(err instanceof Error ? err.message : "Failed to save career path.");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!data) return;

    const lines = [
      `Career GPS: ${data.targetRole.name}`,
      `Progress: ${data.completionPercentage}%`,
      `Estimated time: ${data.estimatedWeeks} weeks`,
      "",
      "Skills to learn:",
      ...data.missingSkills.map((skill) => `- ${skill.name} (${skill.category})`),
      "",
      "Roadmap:",
      ...data.roadmap.flatMap((item, index) => [
        `${index + 1}. ${item.skillName} - ${item.estimatedWeeks} weeks`,
        `   Objective: ${item.objective}`,
        `   Project: ${item.practiceProject}`,
        `   Milestones: ${item.milestones.join("; ")}`
      ])
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.targetRole.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-career-gps.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto grid w-full max-w-[1500px] gap-4 pb-20 lg:pb-4">
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            <Route className="size-3.5 text-primary" />
            Career navigation
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Career GPS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Compare your current skill graph with target roles.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={handleSave}
            disabled={!data || saving}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving..." : "Save path"}
          </Button>
        </div>
      </header>

      <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
        <CardContent className="p-4">
          <RoleSelector value={selectedRoleId} onChange={(roleId) => {
            setSelectedRoleId(roleId || null);
            setSaveStatus(null);
          }} />
        </CardContent>
      </Card>

      {saveStatus && (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
          {saveStatus}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <Card className="rounded-xl border-border bg-card p-8 text-center shadow-sm">
          <RefreshCw className="mx-auto size-5 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Calculating your career path...</p>
        </Card>
      )}

      {data && !loading && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <section className="grid gap-3 md:grid-cols-3">
              <Card className="rounded-xl border-border bg-card py-4 shadow-sm">
                <CardContent className="flex flex-col items-center px-4">
                  <GPSProgressRing percentage={data.completionPercentage} />
                  <h2 className="mt-3 text-sm font-semibold text-foreground">{data.targetRole.name}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {data.skillsCompleted} of {data.totalSkillsRequired} required skills
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border bg-card py-4 shadow-sm">
                <CardContent className="flex items-start gap-3 px-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Clock className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Estimated time</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{data.estimatedWeeks} weeks</p>
                    <p className="mt-1 text-xs text-muted-foreground">{roadmapWeeks} scheduled roadmap weeks</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-border bg-card py-4 shadow-sm">
                <CardContent className="flex items-start gap-3 px-4">
                  <div className="grid size-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
                    <Target className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Skills to learn</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{data.skillsRemaining}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{data.completedSkills.length} already covered</p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
              <CardHeader className="border-b border-border px-4 py-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">Skill breakdown</CardTitle>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative sm:w-64">
                      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={skillQuery}
                        onChange={(event) => setSkillQuery(event.target.value)}
                        placeholder="Search skills"
                        className="h-9 border-input bg-background pl-8"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMissingSort((current) => current === "priority" ? "difficulty" : current === "difficulty" ? "name" : "priority")}
                      className="gap-2"
                    >
                      {missingSort === "name" ? <ArrowDownAZ className="size-4" /> : <ArrowUpDown className="size-4" />}
                      {missingSort === "priority" ? "Priority" : missingSort === "difficulty" ? "Difficulty" : "Name"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 p-4 lg:grid-cols-2">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-foreground">Completed ({filteredCompletedSkills.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {filteredCompletedSkills.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        No completed skills match this view.
                      </p>
                    ) : (
                      filteredCompletedSkills.map((skill) => (
                        <CompletedSkillBadge key={skill.id} name={skill.name} category={skill.category} />
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Target className="size-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-foreground">To learn ({filteredMissingSkills.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {filteredMissingSkills.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        All required skills are covered in this view.
                      </p>
                    ) : (
                      filteredMissingSkills.map((skill) => (
                        <MissingSkillCard
                          key={skill.id}
                          name={skill.name}
                          category={skill.category}
                          learningDifficulty={skill.learningDifficulty}
                        />
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
              <CardHeader className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-sm font-semibold text-foreground">Learning roadmap</CardTitle>
                  <Button type="button" variant="outline" onClick={handleExport} disabled={!data} className="gap-2">
                    <Download className="size-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <SkillRoadmapTimeline
                  roadmap={data.roadmap}
                  completedResourcesMap={completedResourcesMap}
                  onToggleResourceComplete={handleToggleResourceComplete}
                />
              </CardContent>
            </Card>
          </div>

          <aside className="grid gap-4 self-start xl:sticky xl:top-4">
            <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Next best steps
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {data.roadmap.slice(0, 3).map((item, index) => (
                  <div key={item.skillId} className="rounded-xl border border-border bg-muted/45 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Step {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{item.skillName}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.objective}
                    </p>
                    <p className="mt-2 text-xs font-medium text-foreground">
                      {item.estimatedWeeks} weeks, difficulty {item.difficulty}/5
                    </p>
                  </div>
                ))}
                {data.roadmap.length === 0 && (
                  <p className="text-sm text-muted-foreground">You already cover every required skill for this role.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border bg-card py-0 shadow-sm">
              <CardHeader className="border-b border-border px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <History className="size-4 text-primary" />
                  Saved paths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {historyLoading && <p className="text-sm text-muted-foreground">Loading saved paths...</p>}
                {!historyLoading && history.length === 0 && (
                  <p className="text-sm text-muted-foreground">Saved paths will appear here after you save one.</p>
                )}
                {!historyLoading && history.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRoleId(item.roleId)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{item.roleName}</p>
                      <span className="text-xs font-medium text-primary">{item.completionPercentage}%</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.lastUpdated)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}

      {!selectedRoleId && !loading && (
        <Card className="rounded-xl border-border bg-card p-10 text-center shadow-sm">
          <Target className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Select a target role</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose a role above to generate your personalized skill gap, timeline, and saved path.</p>
        </Card>
      )}
    </section>
  );
}
