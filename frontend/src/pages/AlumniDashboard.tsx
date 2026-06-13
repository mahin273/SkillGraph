import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  GraduationCap,
  Briefcase,
  Linkedin,
  Github,
  Mail,
  Settings,
  AlertCircle,
  X,
  UserCheck,
  Sparkles,
  Award,
  Eye,
  Activity,
  Layers,
  MessageCircle
} from "lucide-react";
import {
  acceptMentorshipRequest,
  completeMentorshipRequest,
  declineMentorshipRequest,
  registerAsAlumni,
  getMyAlumniProfile
} from "../services/mentorship.service";
import { getAllSkills } from "../services/matchmaker.service";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from "../store/auth.store";
import { SkillHeatmap } from "../components/admin/SkillHeatmap";
import { IndustryGapChart } from "../components/admin/IndustryGapChart";
import { TrendLineChart } from "../components/admin/TrendLineChart";

export function AlumniDashboard() {
  const { fullName, academicProfile } = useAuthStore();
  const uniName = academicProfile?.universityName || "University";
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "profile">("overview");
  const [loading, setLoading] = useState(true);
  const [myProfile, setMyProfile] = useState<any>(null);

  // Form states for profile setting
  const [willingToMentor, setWillingToMentor] = useState(false);
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentRole, setCurrentRole] = useState("");
  const [yearsExperience, setYearsExperience] = useState(0);
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear());
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [alumniCardUrl, setAlumniCardUrl] = useState("");
  const [mentoringSkills, setMentoringSkills] = useState<string[]>([]);
  const [skillSearchInput, setSkillSearchInput] = useState("");
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load Alumnus Profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getMyAlumniProfile();
      setMyProfile(profile);

      if (profile) {
        setWillingToMentor(profile.willingToMentor);
        setCurrentCompany(profile.currentCompany || "");
        setCurrentRole(profile.currentRole || "");
        setYearsExperience(profile.yearsExperience || 0);
        setGraduationYear(profile.graduationYear || new Date().getFullYear());
        setLinkedinUrl(profile.linkedinUrl || "");
        setAlumniCardUrl(profile.alumniCardUrl || "");
        setMentoringSkills(profile.mentoringSkills || []);
      }
    } catch (err) {
      console.error("Failed to load alumni profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
    // Load skills for suggestion tag select
    void getAllSkills().then((res) => setAllSkills(res)).catch(console.error);
  }, []);

  // Filter skill suggestions
  const skillSuggestions = useMemo(() => {
    if (!skillSearchInput.trim()) return [];
    return allSkills
      .filter(
        (skill) =>
          skill.name.toLowerCase().includes(skillSearchInput.toLowerCase()) &&
          !mentoringSkills.includes(skill.name)
      )
      .slice(0, 5);
  }, [skillSearchInput, allSkills, mentoringSkills]);

  const addMentoringSkill = (skillName: string) => {
    setMentoringSkills((prev) => [...prev, skillName]);
    setSkillSearchInput("");
  };

  const removeMentoringSkill = (skillName: string) => {
    setMentoringSkills((prev) => prev.filter((s) => s !== skillName));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAlumniCardUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await registerAsAlumni({
        graduationYear,
        currentCompany,
        currentRole,
        yearsExperience,
        mentoringSkills,
        willingToMentor,
        linkedinUrl,
        alumniCardUrl
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      void loadProfile();
    } catch (err) {
      console.error("Failed to save alumni profile:", err);
    }
  };

  // Actions for Mentorship Connection requests
  const handleAcceptRequest = async (id: string) => {
    try {
      await acceptMentorshipRequest(id);
      void loadProfile();
    } catch (err) {
      console.error("Failed to accept request:", err);
    }
  };

  const handleCompleteRequest = async (id: string) => {
    try {
      await completeMentorshipRequest(id);
      void loadProfile();
    } catch (err) {
      console.error("Failed to complete connection:", err);
    }
  };

  const handleDeclineRequest = async (id: string) => {
    if (!confirm("Are you sure you want to decline this request?")) return;
    try {
      await declineMentorshipRequest(id);
      void loadProfile();
    } catch (err) {
      console.error("Failed to decline request:", err);
    }
  };

  // Calculate Metrics from profile connection data
  const metrics = useMemo(() => {
    const defaultMetrics = { active: 0, pending: 0, completed: 0, skills: 0 };
    if (!myProfile || !myProfile.mentorships) return defaultMetrics;

    const mentorships = myProfile.mentorships;
    return {
      active: mentorships.filter((m: any) => m.status === "active").length,
      pending: mentorships.filter((m: any) => m.status === "requested").length,
      completed: mentorships.filter((m: any) => m.status === "completed").length,
      skills: myProfile.mentoringSkills?.length || 0
    };
  }, [myProfile]);

  return (
    <section className="flex flex-col gap-6 p-1 md:p-4">
      {/* Header and Profile status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#dfe3ea] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17202a]">
            Welcome back, {fullName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alumni portal for <span className="font-semibold text-[#0c66e4]">{uniName}</span>
          </p>
        </div>

        {myProfile && (
          <Badge className={`px-3 py-1 text-xs font-semibold gap-1.5 border ${
            myProfile.verified
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : myProfile.alumniCardUrl
              ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            {myProfile.verified ? (
              <>
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Verified Mentor
              </>
            ) : myProfile.alumniCardUrl ? (
              <>
                <Clock className="size-3.5 text-amber-600" />
                Pending Verification
              </>
            ) : (
              <>
                <AlertCircle className="size-3.5 text-rose-600" />
                Action Required: Upload ID
              </>
            )}
          </Badge>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-[#dfe3ea] p-1 bg-[#f4f5f7] rounded-lg self-start">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-white text-[#0c66e4] shadow-xs"
              : "text-muted-foreground hover:bg-[#ebecf0] hover:text-[#17202a]"
          }`}
        >
          <Activity className="size-4" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "analytics"
              ? "bg-white text-[#0c66e4] shadow-xs"
              : "text-muted-foreground hover:bg-[#ebecf0] hover:text-[#17202a]"
          }`}
        >
          <Layers className="size-4" />
          University Insights
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-all ${
            activeTab === "profile"
              ? "bg-white text-[#0c66e4] shadow-xs"
              : "text-muted-foreground hover:bg-[#ebecf0] hover:text-[#17202a]"
          }`}
        >
          <Settings className="size-4" />
          Profile Settings
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* KPI Analytics metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Mentees</p>
                <h3 className="mt-1 text-2xl font-bold text-[#17202a]">{metrics.active}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Students in active support</p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[#e9f2ff] text-[#0c66e4]">
                <HeartHandshake className="size-5" />
              </div>
            </Card>

            <Card className="border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Requests</p>
                <h3 className="mt-1 text-2xl font-bold text-[#17202a]">{metrics.pending}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting your response</p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[#fff4e5] text-[#974f0c]">
                <Clock className="size-5" />
              </div>
            </Card>

            <Card className="border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed Sessions</p>
                <h3 className="mt-1 text-2xl font-bold text-[#17202a]">{metrics.completed}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Successful connections</p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
                <Award className="size-5" />
              </div>
            </Card>

            <Card className="border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills Mentored</p>
                <h3 className="mt-1 text-2xl font-bold text-[#17202a]">{metrics.skills}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Registered mentoring skills</p>
              </div>
              <div className="grid size-10 place-items-center rounded-lg bg-[#fdd0ec] text-[#d0248e]">
                <Sparkles className="size-5" />
              </div>
            </Card>
          </div>

          {/* Connections / Requests Workspace */}
          <Card className="border-[#dfe3ea] bg-white shadow-sm">
            <CardHeader className="border-b border-[#edf0f5] p-5">
              <CardTitle className="text-lg font-bold text-[#17202a]">
                Mentorship Connections Manager
              </CardTitle>
              <CardDescription>
                Track and respond to mentorship connection requests from {uniName} students.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              {loading ? (
                <div className="py-12 flex justify-center text-muted-foreground italic">Loading connections...</div>
              ) : !myProfile ? (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground italic mb-4">Please set up your alumnus profile first to start receiving mentorship connections.</p>
                  <Button onClick={() => setActiveTab("profile")} className="bg-[#0c66e4] hover:bg-[#0052cc] text-white">
                    Setup Profile Now
                  </Button>
                </div>
              ) : !myProfile.mentorships || myProfile.mentorships.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground italic border border-dashed border-[#dfe3ea] bg-[#f7f8fa] rounded-lg">
                  No student connection requests received yet. Verified profiles appear to students seeking matches.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {myProfile.mentorships.map((req: any) => {
                    const studentUser = req.student?.user;
                    const isPending = req.status === "requested";
                    const isActive = req.status === "active";
                    const isCompleted = req.status === "completed";

                    return (
                      <div key={req.id} className="rounded-lg border border-[#dfe3ea] bg-[#f7f8fa] p-4 flex flex-col justify-between gap-4 hover:border-[#cfd7e3] hover:shadow-xs transition-all duration-200">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-[#17202a] text-sm">
                                {studentUser?.fullName || "Student"}
                              </h4>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Connected for:
                              </p>
                              <Badge className="bg-[#e9f2ff] text-[#0c66e4] border border-[#0c66e4]/10 hover:bg-[#e9f2ff] text-[10px] font-bold mt-1 py-0.5 px-2">
                                {req.skill?.name || "Skill"}
                              </Badge>
                            </div>

                            {isPending && (
                              <Badge className="bg-[#fff4e5] text-[#974f0c] border border-[#ffe0b2] text-[10px] py-0.5">
                                Pending
                              </Badge>
                            )}
                            {isActive && (
                              <Badge className="bg-[#e9f2ff] text-[#0c66e4] border border-[#d0e2ff] text-[10px] py-0.5">
                                Active
                              </Badge>
                            )}
                            {isCompleted && (
                              <Badge className="bg-[#e7f8ef] text-[#1f845a] border border-[#b8f5d0] text-[10px] py-0.5">
                                Completed
                              </Badge>
                            )}
                          </div>

                          {/* Student Public Profile Galaxy Link */}
                          {req.student?.publicHandle && (
                            <a
                              href={`/galaxy/${req.student.publicHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-xs text-[#0c66e4] font-semibold hover:underline"
                            >
                              <Eye className="size-3.5" />
                              View Skill Galaxy
                              <ArrowUpRight className="size-3" />
                            </a>
                          )}

                          {/* Contact information for active students */}
                          {isActive && studentUser && (
                            <div className="mt-4 rounded-md border border-[#dfe3ea] bg-white p-3 text-xs flex flex-col gap-2 shadow-2xs">
                              <span className="font-bold text-muted-foreground uppercase text-[9px]">Student Contact Details</span>
                              {studentUser.email && (
                                <a href={`mailto:${studentUser.email}`} className="flex items-center gap-1.5 text-[#0c66e4] hover:underline font-semibold overflow-hidden text-ellipsis">
                                  <Mail className="size-3.5 shrink-0" />
                                  {studentUser.email}
                                </a>
                              )}
                              {studentUser.githubHandle && (
                                <a href={`https://github.com/${studentUser.githubHandle}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[#0c66e4] hover:underline font-semibold">
                                  <Github className="size-3.5 shrink-0" />
                                  {studentUser.githubHandle}
                                </a>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions buttons */}
                        <div className="flex gap-2 border-t border-[#edf0f5] pt-3 mt-1">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptRequest(req.id)}
                                className="bg-[#1f845a] hover:bg-[#166042] text-white text-xs grow flex items-center justify-center gap-1.5"
                              >
                                <UserCheck className="size-3.5" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeclineRequest(req.id)}
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs flex items-center justify-center"
                              >
                                <X className="size-3.5" />
                              </Button>
                            </>
                          )}

                          {isActive && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages?id=${req.id}`)}
                                className="border-[#cfd7e3] bg-white text-[#0c66e4] hover:bg-[#e9f2ff] text-xs flex items-center justify-center gap-1.5"
                              >
                                <MessageCircle className="size-3.5" />
                                View Chat
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleCompleteRequest(req.id)}
                                className="bg-[#0c66e4] hover:bg-[#0052cc] text-white text-xs grow flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="size-3.5" />
                                Mark Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeclineRequest(req.id)}
                                className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs"
                                title="Decline/Cancel connection"
                              >
                                Remove
                              </Button>
                            </>
                          )}

                          {isCompleted && (
                            <div className="flex w-full flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/messages?id=${req.id}`)}
                                className="border-[#cfd7e3] bg-white text-[#0c66e4] hover:bg-[#e9f2ff] text-xs flex items-center justify-center gap-1.5"
                              >
                                <MessageCircle className="size-3.5" />
                                View Chat
                              </Button>
                              <span className="text-xs text-muted-foreground italic text-center w-full flex items-center justify-center gap-1.5 py-1">
                                <CheckCircle2 className="size-4 text-emerald-600" />
                                Mentorship completed
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="grid gap-6 animate-in fade-in duration-200">
          <Card className="border-[#dfe3ea] bg-white p-5 shadow-sm">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg font-bold text-[#17202a]">University Skill Insights</CardTitle>
              <CardDescription>
                Review aggregate metrics, target industry requirements, and growth outcomes for {uniName} cohorts.
              </CardDescription>
            </CardHeader>
            <div className="grid gap-6 md:grid-cols-2">
              <SkillHeatmap />
              <IndustryGapChart />
              <div className="md:col-span-2">
                <TrendLineChart />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* PROFILE SETTINGS TAB */}
      {activeTab === "profile" && (
        <div className="grid gap-6 animate-in fade-in duration-200">
          <Card className="border-[#dfe3ea] bg-white shadow-sm">
            <CardHeader className="border-b border-[#edf0f5] p-5">
              <div className="flex items-center gap-2">
                <Settings className="size-5 text-[#0c66e4]" />
                <CardTitle className="text-lg font-bold text-[#17202a]">
                  Mentor Profile Settings
                </CardTitle>
              </div>
              <CardDescription>
                Provide details about your work and graduation status to help {uniName} students connect with you.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="p-5 flex flex-col gap-4">
                {saveSuccess && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Alumni profile saved and updated successfully.
                  </div>
                )}

                {myProfile && (
                  <div className={`flex items-start gap-3 rounded-lg border p-4 text-sm shadow-xs ${
                    myProfile.verified
                      ? "border-emerald-100 bg-emerald-50/50 text-emerald-800"
                      : myProfile.alumniCardUrl
                      ? "border-amber-100 bg-amber-50/50 text-amber-800"
                      : "border-rose-100 bg-rose-50/50 text-rose-800"
                  }`}>
                    {myProfile.verified ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-bold">
                        {myProfile.verified
                          ? "Verified Alumnus Profile"
                          : myProfile.alumniCardUrl
                          ? "Verification Pending Approval"
                          : "ID Photo Verification Required"}
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

                <div className="flex items-center gap-2 p-3.5 bg-[#f7f8fa] border border-[#dfe3ea] rounded-lg justify-between shadow-2xs">
                  <div>
                    <div className="font-bold text-sm text-[#17202a]">Willing to mentor students</div>
                    <div className="text-xs text-muted-foreground">Toggle to display your profile in matching recommendations.</div>
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
                      placeholder="e.g. Google, Apple"
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
                      min={1990}
                      max={2050}
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(parseInt(e.target.value) || new Date().getFullYear())}
                      className="border-[#cfd7e3]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-muted-foreground uppercase">LinkedIn URL</label>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/username"
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
                    Upload a picture of your alumni association card, university certificate, or ID card.
                  </p>
                </div>

                {/* Skills Mentoring Search and Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Skills You Can Mentor</label>
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

                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Type to search and add skills..."
                      value={skillSearchInput}
                      onChange={(e) => setSkillSearchInput(e.target.value)}
                      className="border-[#cfd7e3]"
                    />

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
        </div>
      )}
    </section>
  );
}
