import { useEffect, useState } from "react";
import { useAuthStore } from "../store/auth.store";
import { AdminRoleEditor } from "../components/admin/AdminRoleEditor";
import { AlumniVerificationQueue } from "../components/admin/AlumniVerificationQueue";
import { IndustryGapChart } from "../components/admin/IndustryGapChart";
import { SkillHeatmap } from "../components/admin/SkillHeatmap";
import { TrendLineChart } from "../components/admin/TrendLineChart";
import { UserModeration } from "../components/admin/UserModeration";
import { AuditLogViewer } from "../components/admin/AuditLogViewer";
import { SystemConfigEditor } from "../components/admin/SystemConfigEditor";
import { JobQueueMonitor } from "../components/admin/JobQueueMonitor";
import { GithubConnectionDashboard } from "../components/admin/GithubConnectionDashboard";
import { SkillTaxonomyManager } from "../components/admin/SkillTaxonomyManager";
import { StudentDirectory } from "../components/professor/StudentDirectory";
import { CourseMapper } from "../components/professor/CourseMapper";
import { CapstoneAdviser } from "../components/professor/CapstoneAdviser";
import { CurriculumAnalytics } from "../components/professor/CurriculumAnalytics";
import { TeamBuilder } from "../components/professor/TeamBuilder";
import { getKpiStats, type KpiStats } from "../services/admin.service";
import { UniversityManager } from "../components/admin/UniversityManager";
import { SecurityThreatManager } from "../components/admin/SecurityThreatManager";
import { BarChart3, BookOpen, FileText, Settings as SettingsIcon, ShieldAlert, Sparkles, Users, Database, Github, Award, Layers, Compass, Building, Activity } from "lucide-react";

export function AdminDashboard() {
  const { role, academicProfile } = useAuthStore();
  const isAdmin = role === "admin" || role === "superadmin";
  const isPlatformAdmin = role === "superadmin";
  const [activeTab, setActiveTab] = useState("analytics");
  const [kpiStats, setKpiStats] = useState<KpiStats | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await getKpiStats();
        setKpiStats(stats);
      } catch (err) {
        console.error("Failed to load KPI stats:", err);
      }
    }
    loadStats();
  }, []);

  // Define tabs for Admin vs Professor
  const adminTabs = [
    { id: "analytics", label: "Intelligence Analytics", icon: BarChart3 },
    { id: "users", label: "User Moderation", icon: Users },
    ...(isPlatformAdmin ? [{ id: "universities", label: "University Management", icon: Building }] : []),
    { id: "audits", label: "Security Audit Logs", icon: ShieldAlert },
    { id: "roles", label: "Career Predefined Roles", icon: BookOpen },
    ...(isPlatformAdmin ? [
      { id: "threats", label: "Threats & Service Status", icon: Activity },
      { id: "jobs", label: "Ingestion Jobs Queue", icon: Database },
      { id: "github", label: "GitHub Connections", icon: Github },
      { id: "taxonomy", label: "Skill Taxonomy", icon: Award },
      { id: "config", label: "Global Settings Config", icon: SettingsIcon }
    ] : []),
    { id: "approvals", label: "Alumni Verification Queue", icon: Sparkles }
  ];

  const professorTabs = [
    { id: "analytics", label: "Intelligence Analytics", icon: BarChart3 },
    { id: "curriculum", label: "Curriculum Analytics", icon: Layers },
    { id: "roles", label: "Career Predefined Roles", icon: BookOpen },
    { id: "students", label: "Students Directory", icon: Users },
    { id: "teambuilder", label: "AI Team Builder", icon: Sparkles },
    { id: "courses", label: "Course Skill-Mapping", icon: BookOpen },
    { id: "capstone", label: "Capstone Advising Board", icon: Compass },
  ];

  const tabs = isAdmin ? adminTabs : professorTabs;

  return (
    <section className="mx-auto grid w-full max-w-[1550px] gap-6 pb-20 lg:pb-4">
      {/* Page Header */}
      <header className="rounded-lg border border-[#dfe3ea] bg-white px-5 py-4 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {isAdmin ? "Administrator Workspace" : "Academic Advisor Workspace"}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#17202a]">
            {isAdmin ? "Skill Intelligence & Platform Operations" : "Skill Intelligence & Advising Portal"}
          </h1>
        </div>

        {/* Tab Selectors */}
        <nav className="flex flex-wrap gap-1 rounded-lg bg-[#f0f2f5] p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-white text-[#0c66e4] shadow-sm"
                    : "text-muted-foreground hover:text-[#17202a]"
                }`}
              >
                <Icon className="size-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Platform KPI Metrics */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {isPlatformAdmin ? "Platform Users" : "University Users"}
            </p>
            <h3 className="mt-1 text-2xl font-bold text-[#17202a]">
              {kpiStats ? kpiStats.totalUsers : <span className="animate-pulse text-slate-400">...</span>}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {isPlatformAdmin ? "Total registered accounts" : "Registered university accounts"}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-lg bg-[#e9f2ff] text-[#0c66e4]">
            <Users className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GitHub Connection Rate</p>
            <h3 className="mt-1 text-2xl font-bold text-[#17202a]">
              {kpiStats ? `${kpiStats.connectionRate}%` : <span className="animate-pulse text-slate-400">...</span>}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {kpiStats ? `${kpiStats.githubConnections} connections active` : "calculating..."}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
            <BarChart3 className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">GPS Curated Roles</p>
            <h3 className="mt-1 text-2xl font-bold text-[#17202a]">
              {kpiStats ? kpiStats.totalRoles : <span className="animate-pulse text-slate-400">...</span>}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">Predefined industry expectations</p>
          </div>
          <div className="grid size-10 place-items-center rounded-lg bg-[#fff4e5] text-[#974f0c]">
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="rounded-lg border border-[#dfe3ea] bg-white p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Alumni verification queue</p>
            <h3 className="mt-1 text-2xl font-bold text-[#17202a]">
              {kpiStats ? kpiStats.pendingAlumni : <span className="animate-pulse text-slate-400">...</span>}
            </h3>
            <p className="mt-1 text-[10px] text-muted-foreground">Awaiting review</p>
          </div>
          <div className="grid size-10 place-items-center rounded-lg bg-[#fdd0ec] text-[#d0248e]">
            <Sparkles className="size-5" />
          </div>
        </div>
      </section>

      {/* Tab Contents */}
      <main className="grid gap-6">
        {activeTab === "analytics" && (
          <div className="grid gap-6 md:grid-cols-2">
            <SkillHeatmap />
            <IndustryGapChart />
            <div className="md:col-span-2">
              <TrendLineChart />
            </div>
          </div>
        )}

        {/* Admin Tab content */}
        {isAdmin && activeTab === "users" && <UserModeration />}
        {isAdmin && activeTab === "universities" && isPlatformAdmin && <UniversityManager />}
        {isAdmin && activeTab === "audits" && <AuditLogViewer />}
        {isAdmin && activeTab === "threats" && isPlatformAdmin && <SecurityThreatManager />}
        {isAdmin && activeTab === "jobs" && isPlatformAdmin && <JobQueueMonitor />}
        {isAdmin && activeTab === "github" && isPlatformAdmin && <GithubConnectionDashboard />}
        {isAdmin && activeTab === "taxonomy" && isPlatformAdmin && <SkillTaxonomyManager />}
        {isAdmin && activeTab === "approvals" && <AlumniVerificationQueue />}
        {activeTab === "roles" && (isAdmin || role === "professor") && <AdminRoleEditor />}
        {isAdmin && activeTab === "config" && isPlatformAdmin && <SystemConfigEditor />}

        {/* Professor Tab content */}
        {!isAdmin && activeTab === "curriculum" && <CurriculumAnalytics />}
        {!isAdmin && activeTab === "students" && <StudentDirectory />}
        {!isAdmin && activeTab === "teambuilder" && <TeamBuilder />}
        {!isAdmin && activeTab === "courses" && <CourseMapper />}
        {!isAdmin && activeTab === "capstone" && <CapstoneAdviser />}
      </main>
    </section>
  );
}
