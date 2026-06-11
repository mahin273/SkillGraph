import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Search,
  CheckCircle2,
  Circle,
  ExternalLink,
  GraduationCap,
  Compass,
  Award,
  Clock,
  Sparkles,
  SearchCode,
  TrendingUp,
  BookmarkCheck,
  ChevronRight,
  Info,
  HelpCircle
} from "lucide-react";
import { useAuthStore } from "../store/auth.store";
import { getCareerGPSHistory, type CareerGPSHistoryItem } from "../services/careerGps.service";
import {
  getResourcesForSkill,
  getResourcesForPath,
  completeResource,
  getCompletedResources,
  type LearningResource
} from "../services/resources.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type TabType = "path-recommendations" | "search-by-skill" | "completed-resources";

export function Resources() {
  const { userId } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>("path-recommendations");
  const [history, setHistory] = useState<CareerGPSHistoryItem[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  
  // Recommendations state
  const [pathResources, setPathResources] = useState<LearningResource[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Search state
  const [searchSkill, setSearchSkill] = useState("");
  const [searchedSkillName, setSearchedSkillName] = useState("");
  const [searchResources, setSearchResources] = useState<LearningResource[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Completed state
  const [completedResources, setCompletedResources] = useState<LearningResource[]>([]);
  const [loadingCompleted, setLoadingCompleted] = useState(false);

  // Complete status mapping
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});

  // Filter state for all resources view
  const [textFilter, setTextFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [onlyApproved, setOnlyApproved] = useState(false);

  // Fetch career path history and completed resources on mount
  useEffect(() => {
    if (!userId) return;

    // Load path history
    getCareerGPSHistory(userId)
      .then((historyList) => {
        setHistory(historyList);
        if (historyList.length > 0) {
          setSelectedPathId(historyList[0].id);
        }
      })
      .catch((err) => console.error("Failed to load path history:", err));

    // Load completed resources
    loadCompletedList();
  }, [userId]);

  // Load completed list helper
  const loadCompletedList = () => {
    if (!userId) return;
    setLoadingCompleted(true);
    getCompletedResources(userId)
      .then((list) => {
        setCompletedResources(list);
        const map: Record<string, boolean> = {};
        for (const item of list) {
          map[item.id] = true;
        }
        setCompletedMap(map);
      })
      .catch((err) => console.error("Failed to load completed resources:", err))
      .finally(() => setLoadingCompleted(false));
  };

  // Fetch path resources when path selection changes
  useEffect(() => {
    if (!selectedPathId) {
      setPathResources([]);
      return;
    }

    setLoadingRecommendations(true);
    getResourcesForPath(selectedPathId)
      .then((resources) => {
        setPathResources(resources);
      })
      .catch((err) => console.error("Failed to load path resources:", err))
      .finally(() => setLoadingRecommendations(false));
  }, [selectedPathId]);

  // Trigger skill search
  const handleSkillSearch = (skillName: string) => {
    if (!skillName.trim()) return;
    setLoadingSearch(true);
    setSearchedSkillName(skillName);
    getResourcesForSkill(skillName)
      .then((resources) => {
        setSearchResources(resources);
      })
      .catch((err) => {
        console.error("Failed to search resources:", err);
        setSearchResources([]);
      })
      .finally(() => setLoadingSearch(false));
  };

  // Toggle resource completion status
  const handleToggleComplete = async (resourceId: string) => {
    const wasCompleted = !!completedMap[resourceId];
    try {
      // Optimistic update
      setCompletedMap((prev) => ({
        ...prev,
        [resourceId]: !wasCompleted
      }));

      await completeResource(resourceId, !wasCompleted);
      
      // Reload completed resources list
      loadCompletedList();
    } catch (err) {
      console.error("Failed to toggle resource completion:", err);
      // Revert status on failure
      setCompletedMap((prev) => ({
        ...prev,
        [resourceId]: wasCompleted
      }));
    }
  };

  // Group path recommendations by Skill
  const pathResourcesGroupedBySkill = useMemo(() => {
    const groups: Record<string, { skillName: string; resources: LearningResource[] }> = {};
    
    // Find active path to get missing skills list
    const activePath = history.find((h) => h.id === selectedPathId);
    
    for (const res of pathResources) {
      if (!res.skills) continue;
      for (const rs of res.skills) {
        const sName = rs.skill.name;
        if (!groups[sName]) {
          groups[sName] = { skillName: sName, resources: [] };
        }
        groups[sName].resources.push(res);
      }
    }
    
    return Object.values(groups);
  }, [pathResources, history, selectedPathId]);

  // Pre-filter helper for lists
  const filterList = (list: LearningResource[]) => {
    return list.filter((res) => {
      const matchesText =
        res.title.toLowerCase().includes(textFilter.toLowerCase()) ||
        (res.provider && res.provider.toLowerCase().includes(textFilter.toLowerCase()));
      const matchesType = typeFilter === "All" || res.type === typeFilter;
      const matchesApproved = !onlyApproved || res.isUniversityApproved;
      return matchesText && matchesType && matchesApproved;
    });
  };

  const currentPathName = history.find((h) => h.id === selectedPathId)?.roleName ?? "";

  const resourceTypes = ["All", "Course", "Documentation", "Tutorial", "Video", "Interactive", "Reference", "Practice"];

  return (
    <section className="mx-auto grid w-full max-w-[1400px] gap-6 pb-20 lg:pb-4">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <BookOpen className="size-4 text-primary" />
            Learning Hub
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Learning Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Access university-approved modules and targeted skills prep based on your current path.
          </p>
        </div>
      </header>

      {/* Tabs Layout */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Navigation Sidebar */}
        <aside className="flex flex-col gap-2">
          <button
            onClick={() => setActiveTab("path-recommendations")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "path-recommendations"
                ? "bg-accent text-accent-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <Sparkles className="size-4" />
            <span>Path Recommendations</span>
          </button>
          <button
            onClick={() => setActiveTab("search-by-skill")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "search-by-skill"
                ? "bg-accent text-accent-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <SearchCode className="size-4" />
            <span>Search by Skill</span>
          </button>
          <button
            onClick={() => setActiveTab("completed-resources")}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
              activeTab === "completed-resources"
                ? "bg-accent text-accent-foreground shadow-sm border border-border/40"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            <BookmarkCheck className="size-4" />
            <span>Completed ({completedResources.length})</span>
          </button>

          {/* Quick Filters */}
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Resource Filters</h4>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Search Keywords</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={textFilter}
                    onChange={(e) => setTextFilter(e.target.value)}
                    placeholder="Title, provider..."
                    className="h-9 pl-8 border-input bg-background text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Resource Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {resourceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="only-approved"
                  checked={onlyApproved}
                  onChange={(e) => setOnlyApproved(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring bg-background"
                />
                <label htmlFor="only-approved" className="text-xs font-semibold text-foreground cursor-pointer">
                  University Approved Only
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="min-w-0">
          {/* TAB 1: PATH RECOMMENDATIONS */}
          {activeTab === "path-recommendations" && (
            <div className="space-y-6">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground">Target Career Path</CardTitle>
                  <CardDescription>
                    Select one of your saved career paths to see recommendations tailored to your remaining skill gaps.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {history.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-border bg-muted/20 rounded-lg">
                      <Compass className="mx-auto size-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold text-foreground">No career paths saved yet</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Save a career path inside the Career GPS dashboard to get personalized learning recommendations.
                      </p>
                      <Button
                        onClick={() => (window.location.hash = "/gps")}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 size-sm text-xs animate-pulse"
                      >
                        Go to Career GPS
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {history.map((path) => (
                        <button
                          key={path.id}
                          onClick={() => setSelectedPathId(path.id)}
                          className={`px-4 py-2.5 rounded-lg border text-sm font-semibold text-left transition flex items-center justify-between gap-3 ${
                            selectedPathId === path.id
                              ? "bg-accent border-primary text-primary"
                              : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground leading-none">Target Career Role</p>
                            <p className="mt-1 font-bold text-sm text-foreground">{path.roleName}</p>
                          </div>
                          <Badge variant="outline" className="bg-background border-border text-xs text-foreground">
                            {path.completionPercentage}% Match
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {loadingRecommendations ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground animate-pulse">Loading recommendations...</p>
                </div>
              ) : selectedPathId && pathResourcesGroupedBySkill.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                  <p className="mt-3 text-sm font-semibold text-foreground">All caught up!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    You have covered all required skills for the <strong>{currentPathName}</strong> path, or no resources are mapped yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pathResourcesGroupedBySkill.map((group) => {
                    const filteredGroupResources = filterList(group.resources);
                    if (filteredGroupResources.length === 0) return null;

                    return (
                      <div key={group.skillName} className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-border">
                          <TrendingUp className="size-4 text-primary" />
                          <h3 className="text-sm font-bold text-foreground">
                            Recommendations for <span className="text-primary">{group.skillName}</span>
                          </h3>
                          <Badge className="bg-primary/10 text-primary font-bold text-[10px] ml-auto border border-primary/20">
                            {filteredGroupResources.length} items
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {filteredGroupResources.map((res) => (
                            <ResourceCard
                              key={res.id}
                              resource={res}
                              isCompleted={!!completedMap[res.id]}
                              onToggleComplete={() => handleToggleComplete(res.id)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH BY SKILL */}
          {activeTab === "search-by-skill" && (
            <div className="space-y-6">
              <Card className="border-border bg-card shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-foreground">Find resources for any skill</CardTitle>
                  <CardDescription>
                    Enter a technology or skill name (e.g. React, Docker, Postgresql, AWS) to search all learning paths.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchSkill}
                        onChange={(e) => setSearchSkill(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSkillSearch(searchSkill)}
                        placeholder="Search skill (e.g., React, Git, Docker, Kubernetes)"
                        className="h-10 pl-9 border-input bg-background text-foreground"
                      />
                    </div>
                    <Button onClick={() => handleSkillSearch(searchSkill)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Search
                    </Button>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Common Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {["React", "Node.js", "PostgreSQL", "Docker", "AWS", "Kubernetes", "Playwright", "Python", "SQL", "Git"].map(
                        (skill) => (
                          <button
                            key={skill}
                            onClick={() => {
                              setSearchSkill(skill);
                              handleSkillSearch(skill);
                            }}
                            className="px-2.5 py-1 text-xs rounded-md bg-muted border border-border text-foreground font-semibold hover:border-primary hover:bg-accent transition"
                          >
                            {skill}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {loadingSearch ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground animate-pulse">Searching learning library...</p>
                </div>
              ) : searchedSkillName ? (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    Search Results for <span className="text-primary">{searchedSkillName}</span>
                    <span className="text-xs font-medium text-muted-foreground ml-1">
                      ({filterList(searchResources).length} resources found)
                    </span>
                  </h3>

                  {filterList(searchResources).length === 0 ? (
                    <div className="text-center py-12 bg-card border border-dashed border-border rounded-xl">
                      <HelpCircle className="mx-auto size-8 text-muted-foreground mb-2" />
                      <p className="text-sm font-semibold text-foreground">No resources found</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Try searching with another skill term or clear your filters on the left.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {filterList(searchResources).map((res) => (
                        <ResourceCard
                          key={res.id}
                          resource={res}
                          isCompleted={!!completedMap[res.id]}
                          onToggleComplete={() => handleToggleComplete(res.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 bg-card border border-border rounded-xl shadow-sm">
                  <Compass className="mx-auto size-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold text-foreground">Type in a skill to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Or select one of the common skill tags above to inspect recommendations.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLETED RESOURCES */}
          {activeTab === "completed-resources" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Completed Learning Modules
                </h3>
                <Badge className="bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                  {filterList(completedResources).length} modules
                </Badge>
              </div>

              {loadingCompleted ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground animate-pulse">Loading achievements...</p>
                </div>
              ) : filterList(completedResources).length === 0 ? (
                <div className="text-center py-12 bg-card border border-dashed border-border rounded-xl shadow-sm">
                  <CheckCircle2 className="mx-auto size-8 text-muted/40 mb-2" />
                  <p className="text-sm font-semibold text-foreground">No completed resources yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark resources as completed from the recommendations panel as you progress!
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {filterList(completedResources).map((res) => (
                    <ResourceCard
                      key={res.id}
                      resource={res}
                      isCompleted={true}
                      onToggleComplete={() => handleToggleComplete(res.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

interface ResourceCardProps {
  resource: LearningResource;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

function ResourceCard({ resource, isCompleted, onToggleComplete }: ResourceCardProps) {
  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-amber-600">
        ★ {rating.toFixed(1)}
      </span>
    );
  };

  return (
    <div
      className={`group relative flex gap-3.5 rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${
        isCompleted
          ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/30"
          : "border-border bg-card hover:border-muted-foreground/50"
      }`}
    >
      {/* Complete checkbox trigger */}
      <button
        onClick={onToggleComplete}
        className="mt-0.5 flex-shrink-0 focus:outline-none transition-transform active:scale-90"
        title={isCompleted ? "Mark incomplete" : "Mark complete"}
      >
        {isCompleted ? (
          <CheckCircle2 className="size-5 text-emerald-600 fill-emerald-500/10" />
        ) : (
          <Circle className="size-5 text-muted-foreground hover:text-primary" />
        )}
      </button>

      {/* Main card details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          {/* Resource Title & Provider */}
          <div className="min-w-0">
            <h4
              className={`text-sm font-bold leading-tight group-hover:text-primary transition-colors truncate ${
                isCompleted ? "text-muted-foreground/80 line-through decoration-1" : "text-foreground"
              }`}
            >
              {resource.title}
            </h4>
            <p className="text-xs font-medium text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              {resource.provider && <span>{resource.provider}</span>}
              {resource.provider && resource.durationHours && <span className="text-border">•</span>}
              {resource.durationHours && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  {resource.durationHours} hrs
                </span>
              )}
              {resource.rating && <span className="text-border">•</span>}
              {getRatingStars(resource.rating)}
            </p>
          </div>

          {/* External URL trigger */}
          <a
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-primary transition"
            title="Open resource website"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>

        {/* Skill badges & course alerts */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-bold bg-muted text-muted-foreground border border-border">
            {resource.type}
          </Badge>

          {resource.isUniversityApproved && (
            <Badge className="bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20 text-[10px] py-0 px-2 flex items-center gap-1">
              <Award className="size-3" />
              Approved
            </Badge>
          )}

          {resource.courseCode && (
            <Badge className="bg-primary/10 text-primary font-bold border border-primary/20 text-[10px] py-0 px-2 flex items-center gap-1">
              <GraduationCap className="size-3" />
              {resource.courseCode}
            </Badge>
          )}
        </div>

        {/* Syllabus / Register alert for university-approved electives */}
        {resource.isUniversityApproved && resource.courseCode && (
          <div className="mt-2.5 flex gap-2 rounded-lg bg-primary/5 border border-primary/10 p-2 text-[11px] leading-relaxed text-primary">
            <Info className="size-3.5 text-primary flex-shrink-0 mt-0.5" />
            <p className="font-semibold">
              Syllabus aligned with <strong>{resource.courseCode}</strong>. Consider enrolling in this university elective next term.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
