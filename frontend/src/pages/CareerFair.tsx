import { useEffect, useState, useMemo } from "react";
import {
  Building2,
  Calendar,
  MapPin,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import {
  getUpcomingCareerFairs,
  getCareerFairMatches,
  type CareerFair as IFCareerFair,
  type CareerFairMatch
} from "../services/careerFair.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "../store/auth.store";
import { CareerFairRecruiter } from "../components/admin/CareerFairRecruiter";

export function CareerFair() {
  const { role } = useAuthStore();
  const [fairs, setFairs] = useState<IFCareerFair[]>([]);
  const [selectedFairId, setSelectedFairId] = useState<string>("");
  const [matches, setMatches] = useState<CareerFairMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<"All" | "Strong" | "Partial" | "Weak">("All");
  const [expandedBooths, setExpandedBooths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadFairs() {
      try {
        setLoading(true);
        const data = await getUpcomingCareerFairs();
        setFairs(data);
        if (data.length > 0) {
          setSelectedFairId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to load career fairs:", err);
        setError("Could not load career fairs.");
        setLoading(false);
      }
    }
    void loadFairs();
  }, []);

  useEffect(() => {
    if (!selectedFairId || role !== "student") {
      setMatches([]);
      if (role && role !== "student") setLoading(false);
      return;
    }

    async function loadMatches() {
      try {
        setLoading(true);
        setError(null);
        const response = await getCareerFairMatches(selectedFairId);
        setMatches(response.matches);
      } catch (err) {
        console.error("Failed to load fair matches:", err);
        setError("Could not calculate matchmaking profiles.");
      } finally {
        setLoading(false);
      }
    }

    void loadMatches();
  }, [selectedFairId, role]);

  const selectedFair = fairs.find((f) => f.id === selectedFairId);

  const toggleExpand = (boothId: string) => {
    setExpandedBooths((prev) => ({
      ...prev,
      [boothId]: !prev[boothId]
    }));
  };

  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const matchesSearch =
        m.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.hiringRoles.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.requiredSkills.some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesTier = selectedTier === "All" || m.matchTier === selectedTier;

      return matchesSearch && matchesTier;
    });
  }, [matches, searchQuery, selectedTier]);

  const stats = useMemo(() => {
    const total = matches.length;
    const strong = matches.filter((m) => m.matchTier === "Strong").length;
    const partial = matches.filter((m) => m.matchTier === "Partial").length;
    const weak = matches.filter((m) => m.matchTier === "Weak").length;
    return { total, strong, partial, weak };
  }, [matches]);

  if (loading && fairs.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Building2 className="mx-auto h-12 w-12 animate-pulse text-muted-foreground" />
          <p className="mt-4 text-sm font-semibold text-[#17202a]">Analyzing career opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 pb-20 lg:pb-4">
      {/* Header */}
      <header className="flex flex-col justify-between gap-4 rounded-xl border border-[#dfe3ea] bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Sparkles className="size-4 text-[#0c66e4]" />
            Career GPS Matcher
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17202a]">
            University Career Fairs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Align your technical skill evidence with real company needs and get matched instantly.
          </p>
        </div>

        {fairs.length > 0 && (
          <div className="flex flex-col gap-1 sm:w-72">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Active Event</label>
            <select
              value={selectedFairId}
              onChange={(e) => setSelectedFairId(e.target.value)}
              className="w-full rounded-lg border border-[#cfd7e3] bg-white px-3 py-2 text-sm text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
            >
              {fairs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.university?.name || "UIU"})
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {fairs.length === 0 ? (
        <Card className="border-[#dfe3ea] bg-white py-12 text-center shadow-sm">
          <CardContent className="flex flex-col items-center justify-center">
            <Building2 className="h-16 w-16 text-[#cbd5e0]" />
            <h3 className="mt-4 text-lg font-semibold text-[#17202a]">No Career Fairs Scheduled</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              There are currently no career fairs active or scheduled for your university. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : role !== "student" ? (
        <>
          {selectedFair && (
            <CareerFairRecruiter fairId={selectedFair.id} />
          )}
        </>
      ) : (
        <>
          {/* Selected Event Card */}
          {selectedFair && (
            <div className="rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
              <div className="flex gap-4 items-center">
                <div className="rounded-lg bg-[#e9f2ff] p-3 text-[#0c66e4]">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#17202a]">{selectedFair.name}</h2>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(selectedFair.eventDate).toLocaleDateString(undefined, {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}
                    </span>
                    {selectedFair.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {selectedFair.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex flex-wrap gap-2">
                <div className="rounded-lg bg-[#f7f8fa] border border-[#dfe3ea] px-3 py-1.5 text-center">
                  <div className="text-xs text-muted-foreground font-medium">Total Companies</div>
                  <div className="text-lg font-bold text-[#17202a]">{stats.total}</div>
                </div>
                <div className="rounded-lg bg-[#e7f8ef] border border-[#b8f5d0] px-3 py-1.5 text-center">
                  <div className="text-xs text-[#1f845a] font-medium">Strong Match</div>
                  <div className="text-lg font-bold text-[#1f845a]">{stats.strong}</div>
                </div>
                <div className="rounded-lg bg-[#fff4e5] border border-[#ffe0b2] px-3 py-1.5 text-center">
                  <div className="text-xs text-[#974f0c] font-medium">Partial Match</div>
                  <div className="text-lg font-bold text-[#974f0c]">{stats.partial}</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[#ffebe6] bg-[#fff6f6] p-4 text-sm text-[#ae2a19] flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Search and Filters */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by company name, role, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-[#cfd7e3]"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <Button
                variant={selectedTier === "All" ? "default" : "outline"}
                onClick={() => setSelectedTier("All")}
                className="h-9 rounded-lg"
              >
                All Booths
              </Button>
              <Button
                variant={selectedTier === "Strong" ? "default" : "outline"}
                onClick={() => setSelectedTier("Strong")}
                className={`h-9 rounded-lg gap-1.5 ${
                  selectedTier === "Strong" ? "bg-[#1f845a] text-white hover:bg-[#166042]" : "text-[#1f845a] border-[#b8f5d0] hover:bg-[#e7f8ef]"
                }`}
              >
                Strong Match
              </Button>
              <Button
                variant={selectedTier === "Partial" ? "default" : "outline"}
                onClick={() => setSelectedTier("Partial")}
                className={`h-9 rounded-lg gap-1.5 ${
                  selectedTier === "Partial" ? "bg-[#d97706] text-white hover:bg-[#b45309]" : "text-[#974f0c] border-[#ffe0b2] hover:bg-[#fff4e5]"
                }`}
              >
                Partial Match
              </Button>
              <Button
                variant={selectedTier === "Weak" ? "default" : "outline"}
                onClick={() => setSelectedTier("Weak")}
                className="h-9 rounded-lg gap-1.5 text-[#ae2a19] border-[#ffd2cc] hover:bg-[#ffebe6]"
              >
                Weak Match
              </Button>
            </div>
          </div>

          {/* Companies Booth List */}
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Calculating matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="rounded-xl border border-[#dfe3ea] bg-white py-12 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No companies match your current filters.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredMatches.map((booth) => {
                const isExpanded = expandedBooths[booth.id] || false;
                const matchBadgeColor =
                  booth.matchTier === "Strong"
                    ? "bg-[#e7f8ef] text-[#1f845a] border-[#b8f5d0]"
                    : booth.matchTier === "Partial"
                    ? "bg-[#fff4e5] text-[#974f0c] border-[#ffe0b2]"
                    : "bg-[#ffebe6] text-[#ae2a19] border-[#ffd2cc]";

                return (
                  <Card key={booth.id} className="overflow-hidden border-[#dfe3ea] bg-white shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="p-5 border-b border-[#edf0f5]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground bg-[#f7f8fa] border border-[#dfe3ea] rounded px-1.5 py-0.5">
                              Booth {booth.boothNumber || "N/A"}
                            </span>
                            <span className={`text-[11px] font-semibold border rounded px-1.5 py-0.5 ${matchBadgeColor}`}>
                              {booth.matchTier} Match
                            </span>
                          </div>
                          <CardTitle className="mt-2 text-lg font-bold text-[#17202a] truncate">
                            {booth.companyName}
                          </CardTitle>
                        </div>

                        {/* Match Percentage circular chart or badge */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <span className={`text-2xl font-bold ${
                            booth.matchTier === "Strong"
                              ? "text-[#1f845a]"
                              : booth.matchTier === "Partial"
                              ? "text-[#d97706]"
                              : "text-[#ae2a19]"
                          }`}>
                            {booth.matchPercentage}%
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Match</span>
                        </div>
                      </div>

                      {/* Hiring Roles */}
                      {booth.hiringRoles.length > 0 && (
                        <div className="mt-3.5 flex flex-wrap gap-1.5">
                          {booth.hiringRoles.map((role, idx) => (
                            <Badge key={idx} variant="outline" className="border-[#dfe3ea] text-xs font-medium bg-[#f7f8fa] text-[#17202a]">
                              <Briefcase className="mr-1 h-3 w-3 text-muted-foreground" />
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent className="p-0">
                      {isExpanded && (
                        <div className="bg-[#f7f8fa] p-5 border-b border-[#edf0f5]">
                          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Skills Profile Comparison</h4>
                          
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Matched Skills */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#1f845a] uppercase">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Evidenced Skills ({booth.matchedSkills.length})</span>
                              </div>
                              {booth.matchedSkills.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">No skill match evidence yet.</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {booth.matchedSkills.map((s, idx) => (
                                    <Badge key={idx} className="bg-[#e7f8ef] text-[#1f845a] hover:bg-[#e7f8ef] border border-[#b8f5d0] text-[11px] py-0.5">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Gap Skills */}
                            <div>
                              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-[#ae2a19] uppercase">
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span>Skill Gaps ({booth.gapSkills.length})</span>
                              </div>
                              {booth.gapSkills.length === 0 ? (
                                <p className="text-xs text-[#1f845a] font-medium">All required skills met!</p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {booth.gapSkills.map((s, idx) => {
                                    const orig = booth.requiredSkills.find((rs) => rs.name === s);
                                    return (
                                      <Badge key={idx} variant="outline" className="text-muted-foreground border-[#cfd7e3] text-[11px] bg-white py-0.5">
                                        {s} {orig ? `(Weight: ${orig.criticality})` : ""}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>

                          {booth.gapSkills.length > 0 && (
                            <div className="mt-4 border-t border-[#edf0f5] pt-3 flex items-start gap-2 text-xs text-muted-foreground">
                              <HelpCircle className="h-4 w-4 text-[#0c66e4] shrink-0 mt-0.5" />
                              <p>
                                <strong>Match Tip:</strong> Strengthen gaps like <em>{booth.gapSkills.slice(0, 2).join(", ")}</em> through repository commits or university projects to raise your match percentage before visiting this booth.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => toggleExpand(booth.id)}
                        className="flex w-full items-center justify-center gap-1 px-4 py-3 text-xs font-bold text-muted-foreground hover:bg-[#f7f8fa] hover:text-[#17202a] transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Collapse details
                            <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Compare skill requirements
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
