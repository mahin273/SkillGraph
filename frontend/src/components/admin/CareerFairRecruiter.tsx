import { useEffect, useState, useMemo } from "react";
import {
  Users,
  Mail,
  CheckCircle2,
  AlertCircle,
  Building2,
  Send,
  Search,
  Sparkles,
  FileText,
  BadgeAlert
} from "lucide-react";
import {
  getFairBooths,
  searchTalents,
  sendInterviewInvite,
  type CareerFairBooth,
  type TalentSearchResult
} from "../../services/careerFair.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CareerFairRecruiterProps {
  fairId: string;
}

export function CareerFairRecruiter({ fairId }: CareerFairRecruiterProps) {
  const [booths, setBooths] = useState<CareerFairBooth[]>([]);
  const [selectedBoothId, setSelectedBoothId] = useState<string>("");
  const [talents, setTalents] = useState<TalentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Search / filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [minMatch, setMinMatch] = useState<number>(0);
  
  // Invite Dialog state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState<TalentSearchResult | null>(null);
  const [inviteMessage, setInviteMessage] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [invitedStudentIds, setInvitedStudentIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!fairId) return;

    async function loadBooths() {
      try {
        setLoading(true);
        setError(null);
        const data = await getFairBooths(fairId);
        setBooths(data);
        if (data.length > 0) {
          setSelectedBoothId(data[0].id);
        } else {
          setSelectedBoothId("");
          setTalents([]);
        }
      } catch (err) {
        console.error("Failed to load booths:", err);
        setError("Could not load career fair booths.");
      } finally {
        setLoading(false);
      }
    }
    void loadBooths();
  }, [fairId]);

  useEffect(() => {
    if (!fairId || !selectedBoothId) {
      setTalents([]);
      return;
    }

    async function loadTalents() {
      try {
        setLoading(true);
        setError(null);
        const data = await searchTalents(fairId, selectedBoothId);
        setTalents(data);
      } catch (err) {
        console.error("Failed to load talents:", err);
        setError("Could not search for students matching requirements.");
      } finally {
        setLoading(false);
      }
    }
    void loadTalents();
  }, [fairId, selectedBoothId]);

  const selectedBooth = booths.find((b) => b.id === selectedBoothId);

  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      const matchesSearch = t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.matchedSkills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesMinScore = t.matchPercentage >= minMatch;
      return matchesSearch && matchesMinScore;
    });
  }, [talents, searchQuery, minMatch]);

  const handleOpenInvite = (talent: TalentSearchResult) => {
    setSelectedTalent(talent);
    setInviteMessage(
      `Hello ${talent.fullName},\n\nWe noticed your strong matching skills in ${talent.matchedSkills.slice(0, 3).join(", ")}! We would love for you to drop by our booth (${selectedBooth?.boothNumber || "N/A"}) at the ${selectedBooth?.companyName || "company"} area to discuss opportunities.`
    );
    setShowInviteModal(true);
  };

  const handleSendInvite = async () => {
    if (!selectedTalent || !selectedBooth || !fairId) return;
    setSendingInvite(true);
    try {
      await sendInterviewInvite({
        studentId: selectedTalent.studentId,
        boothId: selectedBooth.id,
        fairId,
        message: inviteMessage
      });
      setInvitedStudentIds((prev) => ({ ...prev, [selectedTalent.studentId]: true }));
      setShowInviteModal(false);
      setSelectedTalent(null);
      setInviteMessage("");
    } catch (err) {
      console.error("Failed to send invite:", err);
      alert("Failed to send interview invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Recruiter Configuration bar */}
      <div className="grid gap-4 md:grid-cols-[280px_1fr] items-end bg-[#f7f8fa] p-5 rounded-xl border border-[#dfe3ea]">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Representing Company</label>
          <select
            value={selectedBoothId}
            onChange={(e) => setSelectedBoothId(e.target.value)}
            className="w-full rounded-lg border border-[#cfd7e3] bg-white px-3 py-2 text-sm text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
          >
            <option value="">-- Select Company Booth --</option>
            {booths.map((b) => (
              <option key={b.id} value={b.id}>
                {b.companyName} (Booth {b.boothNumber || "N/A"})
              </option>
            ))}
          </select>
        </div>

        {selectedBooth && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">Target Skills:</span>
            {selectedBooth.requiredSkills.map((skill: any, idx) => (
              <Badge key={idx} variant="outline" className="bg-white border-[#cfd7e3] text-[#17202a]">
                {typeof skill === "string" ? skill : skill.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-[#ffebe6] bg-[#fff6f6] p-4 text-sm text-[#ae2a19] flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Recruiter Controls and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search talents by name or matching skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-[#cfd7e3]"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Min Match Score:</span>
          <div className="flex gap-1">
            {[0, 40, 70].map((score) => (
              <Button
                key={score}
                variant={minMatch === score ? "default" : "outline"}
                onClick={() => setMinMatch(score)}
                className="h-8 text-xs rounded-lg px-3"
              >
                {score === 0 ? "All" : `${score}%+`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Talents Table/List */}
      {loading && talents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Users className="size-8 animate-pulse text-[#0c66e4]" />
          <span className="text-sm font-semibold">Searching university database for matching candidates...</span>
        </div>
      ) : filteredTalents.length === 0 ? (
        <div className="rounded-xl border border-[#dfe3ea] bg-white py-12 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">No student profiles match the filter requirements.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTalents.map((talent) => {
            const hasBeenInvited = invitedStudentIds[talent.studentId] || false;
            
            return (
              <Card key={talent.studentId} className="border-[#dfe3ea] bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-5 border-b border-[#edf0f5]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-[#17202a] truncate">
                        {talent.fullName}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        University Student • {talent.skills.length} active skills
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">Match</span>
                        <div className={`text-xl font-black ${
                          talent.matchPercentage >= 70
                            ? "text-[#1f845a]"
                            : talent.matchPercentage >= 40
                            ? "text-[#d97706]"
                            : "text-[#ae2a19]"
                        }`}>{talent.matchPercentage}%</div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Matched Skills ({talent.matchedSkills.length})</span>
                    {talent.matchedSkills.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic">No matched skills.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {talent.matchedSkills.map((s, idx) => (
                          <Badge key={idx} className="bg-[#e7f8ef] text-[#1f845a] border-[#b8f5d0] text-[10px] py-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {talent.gapSkills.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skill Gaps ({talent.gapSkills.length})</span>
                      <div className="flex flex-wrap gap-1">
                        {talent.gapSkills.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="border-[#dfe3ea] text-muted-foreground text-[10px] py-0.5">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 pt-3 border-t border-[#edf0f5] flex items-center justify-between">
                    <a
                      href={`/galaxy/${talent.publicHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-[#0c66e4] hover:underline flex items-center gap-1"
                    >
                      <FileText className="size-3.5" />
                      View Skill Galaxy
                    </a>

                    <Button
                      size="sm"
                      onClick={() => handleOpenInvite(talent)}
                      disabled={hasBeenInvited}
                      className={`gap-1.5 h-8 text-xs font-semibold ${
                        hasBeenInvited
                          ? "bg-[#e7f8ef] text-[#1f845a] hover:bg-[#e7f8ef] border border-[#b8f5d0]"
                          : "bg-[#0c66e4] text-white hover:bg-[#0055cc]"
                      }`}
                    >
                      {hasBeenInvited ? (
                        <>
                          <CheckCircle2 className="size-3.5" />
                          Invited
                        </>
                      ) : (
                        <>
                          <Send className="size-3.5" />
                          Invite to Booth
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && selectedTalent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[#dfe3ea] bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-[#17202a]">Send Interview Invitation</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Invite <strong className="text-[#17202a]">{selectedTalent.fullName}</strong> to visit {selectedBooth?.companyName}.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Invitation Message</label>
              <textarea
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-[#cfd7e3] p-3 text-sm text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
                placeholder="Enter invite message..."
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-[#edf0f5] pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false);
                  setSelectedTalent(null);
                }}
                disabled={sendingInvite}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={sendingInvite || !inviteMessage.trim()}
                className="gap-2 bg-[#0c66e4] text-white hover:bg-[#0055cc]"
              >
                {sendingInvite ? (
                  "Sending Invite..."
                ) : (
                  <>
                    <Send className="size-3.5" />
                    Send Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
