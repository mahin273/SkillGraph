import { useEffect, useState, useMemo } from "react";
import {
  HeartHandshake,
  Search,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
  Briefcase,
  Linkedin,
  Github,
  Mail,
  Settings,
  AlertCircle,
  X,
  ChevronRight,
  UserCheck,
  Sparkles,
  Plus
} from "lucide-react";
import {
  getRecommendedMentors,
  requestMentorship,
  acceptMentorshipRequest,
  registerAsAlumni,
  getMyAlumniProfile,
  type AlumniProfile
} from "../services/mentorship.service";
import { MentorshipWorkspace } from "../components/shared/MentorshipWorkspace";
import { getAllSkills } from "../services/matchmaker.service";
import { getRoles } from "../services/careerGps.service";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../store/auth.store";

export function MentorMatch() {
  const { userId, fullName, academicProfile, role } = useAuthStore();
  const uniName = academicProfile?.universityName || "University";
  const isAlumni = role === "alumni";
  const [activeTab, setActiveTab] = useState<"find_mentor" | "mentor_hub">(
    isAlumni ? "mentor_hub" : "find_mentor"
  );

  // Data states
  const [mentors, setMentors] = useState<AlumniProfile[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [allSkills, setAllSkills] = useState<Array<{ name: string; category: string }>>([]);

  // Selections
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [mentorsLoading, setMentorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Requesting Mentorship inline state
  const [requestingAlumniId, setRequestingAlumniId] = useState<string | null>(null);
  const [selectedSkillForRequest, setSelectedSkillForRequest] = useState<string>("");

  // Alumni Hub Form states
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [yearsExperience, setYearsExperience] = useState<number>(1);
  const [graduationYear, setGraduationYear] = useState<number>(new Date().getFullYear());
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [willingToMentor, setWillingToMentor] = useState(true);
  const [mentoringSkills, setMentoringSkills] = useState<string[]>([]);
  const [skillSearchInput, setSkillSearchInput] = useState("");
  const [alumniCardUrl, setAlumniCardUrl] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAlumniCardUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Fetch initial configuration
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [rolesData, skillsData, ownProfile] = await Promise.all([
          getRoles(),
          getAllSkills(),
          getMyAlumniProfile().catch(() => null)
        ]);

        setRoles(rolesData);
        setAllSkills(skillsData);

        if (ownProfile) {
          setMyProfile(ownProfile);
          setCurrentCompany(ownProfile.currentCompany || "");
          setCurrentRole(ownProfile.currentRole || "");
          setYearsExperience(ownProfile.yearsExperience || 1);
          setGraduationYear(ownProfile.graduationYear || new Date().getFullYear());
          setLinkedinUrl(ownProfile.linkedinUrl || "");
          setWillingToMentor(ownProfile.willingToMentor ?? true);
          setMentoringSkills(ownProfile.mentoringSkills || []);
          setAlumniCardUrl(ownProfile.alumniCardUrl || "");
        }

        if (rolesData.length > 0) {
          setSelectedRoleId(rolesData[0].id);
        } else {
          void loadMentors("");
        }
      } catch (err) {
        console.error("Error loading mentorship data:", err);
        setError("Failed to load initial mentorship settings.");
      } finally {
        setLoading(false);
      }
    }
    void loadInitialData();
  }, []);

  // Fetch recommended mentors when role changes
  useEffect(() => {
    if (isAlumni) return;
    if (!selectedRoleId && roles.length > 0) return;
    void loadMentors(selectedRoleId);
  }, [selectedRoleId, isAlumni]);

  async function loadMentors(roleId: string) {
    try {
      setMentorsLoading(true);
      const data = await getRecommendedMentors(roleId || undefined);
      setMentors(data);
    } catch (err) {
      console.error("Error fetching recommended mentors:", err);
      setError("Failed to fetch recommended mentors.");
    } finally {
      setMentorsLoading(false);
    }
  }

  async function refreshOwnProfile() {
    try {
      const ownProfile = await getMyAlumniProfile();
      setMyProfile(ownProfile);
      if (ownProfile) {
        setCurrentCompany(ownProfile.currentCompany || "");
        setCurrentRole(ownProfile.currentRole || "");
        setYearsExperience(ownProfile.yearsExperience || 1);
        setGraduationYear(ownProfile.graduationYear || new Date().getFullYear());
        setLinkedinUrl(ownProfile.linkedinUrl || "");
        setWillingToMentor(ownProfile.willingToMentor ?? true);
        setMentoringSkills(ownProfile.mentoringSkills || []);
        setAlumniCardUrl(ownProfile.alumniCardUrl || "");
      }
    } catch (err) {
      console.error("Error refreshing own profile:", err);
    }
  }

  // Handle Mentorship Connection Request
  const handleRequestMentorship = async (alumniId: string, skillName: string) => {
    if (!skillName) return;
    try {
      setError(null);
      setSuccess(null);
      await requestMentorship({
        alumniId,
        skillName
      });
      setSuccess(`Successfully requested mentorship from alumnus for skill "${skillName}"!`);
      setRequestingAlumniId(null);
      setSelectedSkillForRequest("");
      // Reload mentors list to reflect request state
      void loadMentors(selectedRoleId);
    } catch (err: any) {
      console.error("Failed to request mentorship:", err);
      setError(err?.response?.data?.message || "Failed to submit mentorship request.");
    }
  };

  // Handle Accept Mentorship Request
  const handleAcceptRequest = async (requestId: string) => {
    try {
      setError(null);
      setSuccess(null);
      await acceptMentorshipRequest(requestId);
      setSuccess("Mentorship request accepted successfully!");
      await refreshOwnProfile();
    } catch (err) {
      console.error("Failed to accept request:", err);
      setError("Failed to accept mentorship request.");
    }
  };

  // Handle Save Alumni Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      const profile = await registerAsAlumni({
        graduationYear,
        currentCompany,
        currentRole,
        yearsExperience,
        mentoringSkills,
        willingToMentor,
        linkedinUrl,
        alumniCardUrl: alumniCardUrl || undefined
      });
      setMyProfile(profile);
      setSuccess("Alumni mentor profile saved successfully!");
      // If we are registered and willing to mentor, refresh mentors list just in case
      void loadMentors(selectedRoleId);
    } catch (err) {
      console.error("Failed to save alumni profile:", err);
      setError("Failed to save alumni profile.");
    }
  };

  // Skill Suggestions filtering for multi-select
  const skillSuggestions = useMemo(() => {
    if (!skillSearchInput.trim()) return [];
    const searchLower = skillSearchInput.toLowerCase();
    return allSkills
      .filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) &&
          !mentoringSkills.some((ms) => ms.toLowerCase() === s.name.toLowerCase())
      )
      .slice(0, 5);
  }, [skillSearchInput, allSkills, mentoringSkills]);

  const addMentoringSkill = (skillName: string) => {
    if (!mentoringSkills.some((ms) => ms.toLowerCase() === skillName.toLowerCase())) {
      setMentoringSkills([...mentoringSkills, skillName]);
    }
    setSkillSearchInput("");
  };

  const removeMentoringSkill = (skillName: string) => {
    setMentoringSkills(mentoringSkills.filter((s) => s !== skillName));
  };

  // Filtering recommended mentors locally by search query
  const filteredMentors = useMemo(() => {
    return mentors.filter((m) => {
      const searchLower = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(searchLower) ||
        (m.currentCompany && m.currentCompany.toLowerCase().includes(searchLower)) ||
        (m.currentRole && m.currentRole.toLowerCase().includes(searchLower)) ||
        m.mentoringSkills.some((s) => s.toLowerCase().includes(searchLower))
      );
    });
  }, [mentors, searchQuery]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <HeartHandshake className="mx-auto h-12 w-12 animate-pulse text-[#0c66e4]" />
          <p className="mt-4 text-sm font-semibold text-[#17202a]">Matching alumni mentors...</p>
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
            {uniName} Alumni Connect
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17202a]">
            Alumni Mentor Matchmaker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect with alumni working in your target career paths to bridge your skills gaps.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg border border-[#cfd7e3] bg-[#f7f8fa] p-1 shrink-0">
          <button
            onClick={() => {
              setActiveTab("find_mentor");
              setError(null);
              setSuccess(null);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === "find_mentor"
                ? "bg-white text-[#0c66e4] shadow-xs"
                : "text-muted-foreground hover:text-[#17202a]"
            }`}
          >
            Find a Mentor
          </button>
          <button
            onClick={() => {
              setActiveTab("mentor_hub");
              setError(null);
              setSuccess(null);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-all ${
              activeTab === "mentor_hub"
                ? "bg-white text-[#0c66e4] shadow-xs"
                : "text-muted-foreground hover:text-[#17202a]"
            }`}
          >
            Alumnus Hub
          </button>
        </div>
      </header>

      {/* Global Alerts */}
      {error && (
        <div className="rounded-lg border border-[#ffebe6] bg-[#fff6f6] p-4 text-sm text-[#ae2a19] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-[#e3fcef] bg-[#efffd6] p-4 text-sm text-[#1f845a] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* FIND MENTOR TAB */}
      {activeTab === "find_mentor" && (
        <div className="flex flex-col gap-6">
          {/* Target Role Selector & Search */}
          <div className="flex flex-col gap-4 rounded-xl border border-[#dfe3ea] bg-white p-5 shadow-sm sm:flex-row sm:items-center justify-between">
            <div className="flex flex-col gap-1.5 sm:w-80">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Select Your Target Role Gaps
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full rounded-lg border border-[#cfd7e3] bg-white px-3 py-2 text-sm text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
              >
                <option value="">No Role Gaps (Weak/Dormant Skills Fallback)</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search mentors by name, company, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 border-[#cfd7e3]"
              />
            </div>
          </div>

          {/* Mentors List */}
          {mentorsLoading ? (
            <div className="py-12 text-center text-muted-foreground">Searching for matching mentors...</div>
          ) : filteredMentors.length === 0 ? (
            <Card className="border-[#dfe3ea] bg-white py-12 text-center shadow-sm">
              <CardContent className="flex flex-col items-center justify-center">
                <HeartHandshake className="h-16 w-16 text-[#cbd5e0]" />
                <h3 className="mt-4 text-lg font-semibold text-[#17202a]">No Matching Mentors</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-md">
                  We couldn't find any alumni matching your target role requirements. Try changing your target role or registration skills.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredMentors.map((mentor) => {
                const isRequestingThis = requestingAlumniId === mentor.id;
                // Exclude skills student already requested or mentor doesn't teach
                const hasPending = mentor.existingMentorship?.status === "requested";
                const hasActive = mentor.existingMentorship?.status === "active";

                return (
                  <Card key={mentor.id} className="overflow-hidden border-[#dfe3ea] bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                    <CardHeader className="p-5 border-b border-[#edf0f5]">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[#0c66e4] bg-[#e9f2ff] rounded px-2 py-0.5 flex items-center gap-1">
                              <GraduationCap className="size-3.5" />
                              Class of {mentor.graduationYear || "N/A"}
                            </span>
                            {mentor.yearsExperience !== null && (
                              <span className="text-xs font-medium text-muted-foreground bg-[#f7f8fa] border border-[#dfe3ea] rounded px-1.5 py-0.5">
                                {mentor.yearsExperience} yrs exp
                              </span>
                            )}
                          </div>
                          <CardTitle className="mt-2.5 text-lg font-bold text-[#17202a]">
                            {mentor.name}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#17202a]">
                            <Briefcase className="size-3.5 text-muted-foreground" />
                            {mentor.currentRole || "Software Engineer"} at {mentor.currentCompany || "Technology Firm"}
                          </CardDescription>
                        </div>

                        {/* Connection Status Badge */}
                        {hasPending && (
                          <Badge variant="outline" className="bg-[#fff4e5] text-[#974f0c] border-[#ffe0b2] shrink-0 font-semibold px-2 py-1 h-fit">
                            <Clock className="size-3 mr-1" />
                            Requested
                          </Badge>
                        )}
                        {hasActive && (
                          <Badge variant="outline" className="bg-[#e7f8ef] text-[#1f845a] border-[#b8f5d0] shrink-0 font-semibold px-2 py-1 h-fit">
                            <CheckCircle2 className="size-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 flex-1 flex flex-col gap-4">
                      {/* Skill Match stats */}
                      {mentor.matchingSkills.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-bold text-[#1f845a] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Sparkles className="size-3" />
                            Gap Skills Mentor Can Support ({mentor.matchingSkills.length})
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {mentor.matchingSkills.map((skill, index) => (
                              <Badge key={index} className="bg-[#e7f8ef] text-[#1f845a] hover:bg-[#e7f8ef] border border-[#b8f5d0] text-[11px] py-0.5">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mentoring Skills */}
                      <div>
                        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                          All Offered Mentoring Skills
                        </h4>
                        <div className="flex flex-wrap gap-1.5 font-medium">
                          {mentor.mentoringSkills.map((skill, index) => {
                            const isMatch = mentor.matchingSkills.includes(skill);
                            if (isMatch) return null; // Avoid duplicate display
                            return (
                              <Badge key={index} variant="outline" className="text-muted-foreground border-[#cfd7e3] text-[11px] bg-white py-0.5">
                                {skill}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Contact Info (Only if active connection) */}
                      {hasActive && (
                        <div className="flex flex-col gap-3">
                          <div className="rounded-lg bg-[#f7f8fa] border border-[#dfe3ea] p-3 flex flex-col gap-1.5 text-xs text-[#17202a]">
                            <div className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] mb-1">Mentor Contact Details</div>
                            {mentor.email && (
                              <a href={`mailto:${mentor.email}`} className="flex items-center gap-1.5 text-[#0c66e4] hover:underline font-semibold">
                                <Mail className="size-3.5 text-muted-foreground" />
                                {mentor.email}
                              </a>
                            )}
                            {mentor.githubHandle && (
                              <a href={`https://github.com/${mentor.githubHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#0c66e4] hover:underline font-semibold">
                                <Github className="size-3.5 text-muted-foreground" />
                                github.com/{mentor.githubHandle}
                              </a>
                            )}
                            {mentor.linkedinUrl && (
                              <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#0c66e4] hover:underline font-semibold">
                                <Linkedin className="size-3.5 text-muted-foreground" />
                                LinkedIn Profile
                              </a>
                            )}
                          </div>
                          
                          <MentorshipWorkspace
                            mentorshipId={mentor.existingMentorship!.id}
                            skillName={(mentor.existingMentorship as any).skill?.name || "Skill"}
                            partnerName={mentor.name}
                            partnerRole="student"
                            initialStatus={mentor.existingMentorship!.status}
                            initialMilestones={(mentor.existingMentorship as any).milestones || []}
                            onRefresh={() => loadMentors(selectedRoleId)}
                          />
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-5 bg-[#f7f8fa] border-t border-[#edf0f5] flex flex-wrap gap-3 items-center justify-between">
                      <div className="flex gap-2">
                        {mentor.linkedinUrl && (
                          <a
                            href={mentor.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-[#cfd7e3] bg-white px-3 py-1.5 text-xs font-semibold text-[#17202a] hover:bg-[#f7f8fa] gap-1 transition-colors"
                          >
                            <Linkedin className="size-3 text-[#0a66c2]" />
                            LinkedIn
                          </a>
                        )}
                      </div>

                      {/* Mentorship Request trigger */}
                      {!mentor.existingMentorship && (
                        <div className="w-full sm:w-auto flex flex-col gap-2 items-end">
                          {isRequestingThis ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <select
                                value={selectedSkillForRequest}
                                onChange={(e) => setSelectedSkillForRequest(e.target.value)}
                                className="rounded-lg border border-[#cfd7e3] bg-white px-2 py-1.5 text-xs text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
                              >
                                <option value="">Select gap skill...</option>
                                {mentor.matchingSkills.map((s, idx) => (
                                  <option key={idx} value={s}>
                                    {s}
                                  </option>
                                ))}
                                {/* If no matching skills, fallback to all of their skills */}
                                {mentor.matchingSkills.length === 0 &&
                                  mentor.mentoringSkills.map((s, idx) => (
                                    <option key={idx} value={s}>
                                      {s}
                                    </option>
                                  ))}
                              </select>
                              <Button
                                size="sm"
                                disabled={!selectedSkillForRequest}
                                onClick={() => handleRequestMentorship(mentor.id, selectedSkillForRequest)}
                                className="bg-[#1f845a] hover:bg-[#166042] text-white"
                              >
                                Request
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRequestingAlumniId(null);
                                  setSelectedSkillForRequest("");
                                }}
                                className="text-muted-foreground p-1"
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setRequestingAlumniId(mentor.id);
                                if (mentor.matchingSkills.length > 0) {
                                  setSelectedSkillForRequest(mentor.matchingSkills[0]);
                                } else if (mentor.mentoringSkills.length > 0) {
                                  setSelectedSkillForRequest(mentor.mentoringSkills[0]);
                                }
                              }}
                              className="w-full sm:w-auto bg-[#0c66e4] text-white hover:bg-[#0052cc]"
                            >
                              Request Mentorship
                              <ArrowRight className="size-3.5 ml-1" />
                            </Button>
                          )}
                        </div>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MENTOR HUB TAB */}
      {activeTab === "mentor_hub" && (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Alumni Registration Form */}
          <Card className="lg:col-span-2 border-[#dfe3ea] bg-white shadow-sm">
            <CardHeader className="border-b border-[#edf0f5] p-5">
              <div className="flex items-center gap-2">
                <Settings className="size-5 text-[#0c66e4]" />
                <CardTitle className="text-lg font-bold text-[#17202a]">
                  Mentor Profile Settings
                </CardTitle>
              </div>
              <CardDescription>
                Provide details about your current work and graduation status to help {uniName} students connect with you.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="p-5 flex flex-col gap-4">
                {myProfile && (
                  <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm shadow-xs ${
                    myProfile.verified
                      ? "border-emerald-100 bg-emerald-50/50 text-emerald-800 animate-in fade-in"
                      : myProfile.alumniCardUrl
                      ? "border-amber-100 bg-amber-50/50 text-amber-800 animate-in fade-in"
                      : "border-rose-100 bg-rose-50/50 text-rose-800 animate-in fade-in"
                  }`}>
                    {myProfile.verified ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold">
                        {myProfile.verified
                          ? "Verified Mentor Profile"
                          : myProfile.alumniCardUrl
                          ? "Verification Pending"
                          : "Verification Required"}
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">
                        {myProfile.verified
                          ? "Your profile is fully verified. You will appear in students' mentor recommendation searches."
                          : myProfile.alumniCardUrl
                          ? "Your ID Card photo is under review by system administrators. Your profile will not appear in student searches until approved."
                          : "Please upload your Alumni ID Card photo below. Your profile will not appear in student searches until verified."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2 p-3 bg-[#f7f8fa] border border-[#dfe3ea] rounded-lg justify-between">
                  <div>
                    <div className="font-bold text-sm text-[#17202a]">Willing to mentor students</div>
                    <div className="text-xs text-muted-foreground">Toggle to display your profile in matches.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={willingToMentor}
                    onChange={(e) => setWillingToMentor(e.target.checked)}
                    className="size-5 accent-[#0c66e4] cursor-pointer"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Current Company</label>
                    <Input
                      type="text"
                      placeholder="e.g. Google, TigerIT"
                      value={currentCompany}
                      onChange={(e) => setCurrentCompany(e.target.value)}
                      className="border-[#cfd7e3]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Current Role</label>
                    <Input
                      type="text"
                      placeholder="e.g. Senior Software Engineer"
                      value={currentRole}
                      onChange={(e) => setCurrentRole(e.target.value)}
                      className="border-[#cfd7e3]"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Years of Experience</label>
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(parseInt(e.target.value) || 0)}
                      className="border-[#cfd7e3]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Graduation Year</label>
                    <Input
                      type="number"
                      min={2000}
                      max={2050}
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="border-[#cfd7e3]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">LinkedIn URL</label>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/..."
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="border-[#cfd7e3]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Alumni ID Card Photo</label>
                  <div className="flex items-center gap-4 rounded-lg border border-[#cfd7e3] bg-white p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#e9f2ff] file:text-[#0c66e4] hover:file:bg-[#e9f2ff]/80 cursor-pointer"
                    />
                    {alumniCardUrl && (
                      <div className="relative size-12 rounded border border-slate-200 overflow-hidden shrink-0">
                        <img src={alumniCardUrl} alt="Card preview" className="size-full object-cover" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Upload a picture of your alumni association card, university ID card, or certificate.
                  </p>
                </div>

                {/* Mentoring Skills Tags Multi-Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Skills You Can Mentor</label>
                  
                  {/* Selected tags */}
                  {mentoringSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-[#cfd7e3] bg-[#f7f8fa] mb-1">
                      {mentoringSkills.map((skill, idx) => (
                        <Badge key={idx} className="bg-[#0c66e4] text-white hover:bg-[#0052cc] text-[11px] gap-1 py-0.5">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeMentoringSkill(skill)}
                            className="hover:bg-black/20 rounded-full p-0.5"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tag search input */}
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search to add skills..."
                      value={skillSearchInput}
                      onChange={(e) => setSkillSearchInput(e.target.value)}
                      className="border-[#cfd7e3]"
                    />

                    {/* Suggestions list */}
                    {skillSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-[#cfd7e3] bg-white shadow-lg overflow-hidden">
                        {skillSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => addMentoringSkill(suggestion.name)}
                            className="flex w-full items-center justify-between px-3 py-2 text-sm text-left hover:bg-[#f7f8fa] transition-colors"
                          >
                            <span>{suggestion.name}</span>
                            <span className="text-xs text-muted-foreground font-medium">{suggestion.category}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="border-t border-[#edf0f5] p-5 justify-end">
                <Button type="submit" className="bg-[#0c66e4] text-white hover:bg-[#0052cc]">
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Received Requests Side Panel */}
          <div className="flex flex-col gap-6">
            <Card className="border-[#dfe3ea] bg-white shadow-sm">
              <CardHeader className="border-b border-[#edf0f5] p-5">
                <div className="flex items-center gap-2">
                  <HeartHandshake className="size-5 text-[#0c66e4]" />
                  <CardTitle className="text-lg font-bold text-[#17202a]">
                    Requests Received
                  </CardTitle>
                </div>
                <CardDescription>
                  Mentorship connection requests from {uniName} students.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 flex flex-col gap-4 max-h-[500px] overflow-y-auto">
                {!myProfile ? (
                  <p className="text-sm text-muted-foreground italic text-center py-6">
                    Register as alumnus to start receiving mentorship requests.
                  </p>
                ) : !myProfile.mentorships || myProfile.mentorships.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-6">
                    No mentorship requests received yet.
                  </p>
                ) : (
                  myProfile.mentorships.map((req: any) => {
                    const studentUser = req.student?.user;
                    const isPending = req.status === "requested";
                    const isActive = req.status === "active";

                    return (
                      <div key={req.id} className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-3.5 flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-[#17202a] text-sm">
                              {studentUser?.fullName || "Student"}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <span>Skill:</span>
                              <Badge className="bg-[#e9f2ff] text-[#0c66e4] border border-[#0c66e4]/10 hover:bg-[#e9f2ff] text-[10px] py-0">
                                {req.skill?.name || "Skill"}
                              </Badge>
                            </div>
                          </div>

                          {isPending && (
                            <Badge className="bg-[#fff4e5] text-[#974f0c] border border-[#ffe0b2] text-[10px]">
                              Pending
                            </Badge>
                          )}
                          {isActive && (
                            <Badge className="bg-[#e7f8ef] text-[#1f845a] border border-[#b8f5d0] text-[10px]">
                              Active
                            </Badge>
                          )}
                        </div>

                        {/* Contact details for Active mentors */}
                        {isActive && studentUser && (
                          <div className="flex flex-col gap-2">
                            <div className="rounded border border-[#dfe3ea] bg-white p-2 text-xs flex flex-col gap-1">
                              <div className="font-semibold text-muted-foreground uppercase text-[9px]">Student Contact</div>
                              {studentUser.email && (
                                <a href={`mailto:${studentUser.email}`} className="flex items-center gap-1 text-[#0c66e4] hover:underline font-semibold">
                                  <Mail className="size-3" />
                                  {studentUser.email}
                                </a>
                              )}
                              {studentUser.githubHandle && (
                                <a href={`https://github.com/${studentUser.githubHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#0c66e4] hover:underline font-semibold">
                                  <Github className="size-3" />
                                  {studentUser.githubHandle}
                                </a>
                              )}
                            </div>
                            
                            <MentorshipWorkspace
                              mentorshipId={req.id}
                              skillName={req.skill?.name || "Skill"}
                              partnerName={studentUser.fullName}
                              partnerRole="mentor"
                              initialStatus={req.status}
                              initialMilestones={(req as any).milestones || []}
                              onRefresh={refreshOwnProfile}
                            />
                          </div>
                        )}

                        {/* Actions */}
                        {isPending && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(req.id)}
                            className="bg-[#1f845a] hover:bg-[#166042] text-white w-full text-xs"
                          >
                            <UserCheck className="size-3.5 mr-1" />
                            Accept Request
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
