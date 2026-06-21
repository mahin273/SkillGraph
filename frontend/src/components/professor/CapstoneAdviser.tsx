import { useEffect, useState } from "react";
import { listCapstoneMatches, listAlumni } from "../../services/admin.service";
import { ArrowRight, CheckCircle2, GitFork, Sparkles, User, Users, ShieldCheck, Tag } from "lucide-react";

export function CapstoneAdviser() {
  const [requests, setRequests] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchMatchesAndAlumni = async () => {
      try {
        setLoading(true);
        const [data, alumniData] = await Promise.all([
          listCapstoneMatches(),
          listAlumni()
        ]);
        setRequests(data);
        setAlumni(alumniData);
      } catch (err: any) {
        setError(err.message || "Failed to load Capstone matches");
      } finally {
        setLoading(false);
      }
    };

    void fetchMatchesAndAlumni();
  }, []);

  const getMatchingAlumni = (requiredSkills: string[]) => {
    if (!requiredSkills || requiredSkills.length === 0) return [];
    
    return alumni.map((al) => {
      const overlap = al.mentoringSkills.filter((sk: string) => 
        requiredSkills.some((reqSk: string) => reqSk.toLowerCase() === sk.toLowerCase())
      );
      
      const score = requiredSkills.length > 0 ? Math.round((overlap.length / requiredSkills.length) * 100) : 0;
      
      return {
        ...al,
        score,
        overlap
      };
    })
    .filter((al) => al.score > 0)
    .sort((a, b) => b.score - a.score);
  };

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading Capstone match advising Board...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-6">
        <div className="grid size-9 place-items-center rounded-lg bg-[#fff4e5] text-[#974f0c]">
          <GitFork className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#17202a]">Capstone Team Matching Advisor</h2>
          <p className="text-xs text-muted-foreground">Monitor student team requests and review matchmaking scores.</p>
        </div>
      </div>

      <div className="space-y-6">
        {requests.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">No active capstone matching requests found.</div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="rounded-lg border border-[#dfe3ea] p-4 bg-[#f7f8fa]">
              {/* Project info header */}
              <div className="flex flex-col gap-2 border-b border-[#e2e6ed] pb-3 mb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#17202a]">
                    Project: {req.project?.title || "Academic Project"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">{req.project?.description || "No description provided."}</p>
                </div>
                <div className="text-xs text-right text-muted-foreground">
                  <p className="font-semibold text-[#17202a]">Owner: {req.requester?.fullName}</p>
                  <p>{req.requester?.email}</p>
                </div>
              </div>

              {/* Required Skills */}
              <div className="mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Required Skills:
                </span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Array.isArray(req.requiredSkills) ? (
                    req.requiredSkills.map((sk: string) => (
                      <span
                        key={sk}
                        className="rounded-md bg-[#eef1f6] border border-[#cfd7e3] px-2 py-0.5 text-xs text-muted-foreground font-medium"
                      >
                        {sk}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None specified</span>
                  )}
                </div>
              </div>

              {/* Match List */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3.5 text-[#0c66e4]" />
                  Matching Candidate Recommendations:
                </span>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {req.matches?.map((match: any) => (
                    <div
                      key={match.id}
                      className="rounded-lg border border-[#dfe3ea] bg-white p-3 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <User className="size-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-semibold text-[#17202a]">{match.user?.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {match.user?.studentProfile?.universityId ? "Department Student" : "External Student"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="inline-flex items-center gap-0.5 rounded bg-[#e7f8ef] px-2 py-0.5 text-[10px] font-semibold text-[#1f845a]">
                          <CheckCircle2 className="size-3" />
                          Match: {Math.round((match.matchScore || 0.75) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {(!req.matches || req.matches.length === 0) && (
                    <span className="text-xs text-muted-foreground p-1">No matches found for this request.</span>
                  )}
                </div>
              </div>

              {/* Alumni Mentorship Matches */}
              <div className="mt-4 pt-4 border-t border-[#e2e6ed]">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="size-3.5 text-[#1f845a]" />
                  Recommended Alumni Mentors:
                </span>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {getMatchingAlumni(req.requiredSkills || []).map((mentor: any) => (
                    <div
                      key={mentor.id}
                      className="rounded-lg border border-[#dfe3ea] bg-white p-3 shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-semibold text-[#17202a]">{mentor.name}</p>
                            <p className="text-[10px] text-gray-500">
                              {mentor.currentRole} at {mentor.currentCompany} (Class of {mentor.graduationYear})
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-0.5 rounded bg-[#e7f8ef] px-1.5 py-0.5 text-[9px] font-semibold text-[#1f845a]">
                          {mentor.score}% Match
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {mentor.overlap.map((sk: string) => (
                          <span key={sk} className="inline-flex items-center gap-0.5 rounded bg-[#edf0f5] text-muted-foreground px-1 py-0.5 text-[9px]">
                            <Tag className="size-2 text-muted-foreground" />
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {getMatchingAlumni(req.requiredSkills || []).length === 0 && (
                    <span className="text-xs text-muted-foreground p-1">No verified matching mentors found for this project stacks.</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
