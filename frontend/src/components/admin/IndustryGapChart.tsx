import { useEffect, useState } from "react";
import { getIndustryGap, IndustryGapItem } from "../../services/admin.service";
import { Loader2, TrendingDown, CheckCircle2, AlertTriangle, Briefcase, HelpCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

export function IndustryGapChart() {
  const [data, setData] = useState<IndustryGapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const { academicProfile } = useAuthStore();
  const universityName = academicProfile?.universityName;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await getIndustryGap();
        setData(res);
        if (res.length > 0) {
          // Default to the first role's ID
          setSelectedRoleId(res[0].roleId);
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching industry gap data:", err);
        setError("Failed to load industry gap data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading industry gap analysis...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <HelpCircle className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error || "No industry gap data available."}</p>
      </div>
    );
  }

  // Get unique roles
  const rolesMap = new Map<string, string>(); // id -> title
  data.forEach((item) => {
    rolesMap.set(item.roleId, item.roleTitle);
  });
  const roles = Array.from(rolesMap.entries()).map(([id, title]) => ({ id, title }));

  // Skills for selected role
  const selectedRoleSkills = data.filter((item) => item.roleId === selectedRoleId);
  const selectedRoleTitle = rolesMap.get(selectedRoleId) || "";

  // Calculate gaps
  const skillsWithGap = selectedRoleSkills.map((item) => {
    // Normalizing expectation and student average (assuming 0-1 or 1-5 scale)
    // We will show percentages for better UI clarity.
    // Let's assume industryRequired and studentAverage are between 0 and 1, or 1 and 5.
    // We scale them dynamically to 0-100% representation.
    const isFiveScale = item.industryRequired > 1.0;
    const scaleFactor = isFiveScale ? 20 : 100;

    const reqPct = Math.min(Math.max(item.industryRequired * scaleFactor, 0), 100);
    const avgPct = Math.min(Math.max(item.studentAverage * scaleFactor, 0), 100);
    const gap = reqPct - avgPct;

    return {
      ...item,
      reqPct,
      avgPct,
      gap,
    };
  }).sort((a, b) => b.gap - a.gap); // Highlight biggest gaps first

  // Summary statistics for selected role
  const criticalGapsCount = skillsWithGap.filter((s) => s.gap > 20).length;
  const meetingCount = skillsWithGap.filter((s) => s.gap <= 0).length;

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            Market Gap
          </span>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
            {universityName ? `${universityName} Alignment Gap` : "Industry Alignment Gap"}
          </h3>
          <p className="text-xs text-slate-500">
            {universityName || "Student"} cohort proficiency vs. target industry role requirements.
          </p>
        </div>

        {/* Role Selector */}
        <div className="relative">
          <Briefcase className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <select
            value={selectedRoleId}
            onChange={(e) => setSelectedRoleId(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-800 shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:w-56"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-3">
          <div className="flex items-center gap-1.5 text-rose-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Critical Gaps</span>
          </div>
          <p className="mt-1 text-2xl font-black text-rose-700">{criticalGapsCount}</p>
          <p className="text-[10px] text-rose-600/80">Skills with deficiency &gt; 20%</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
          <div className="flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Aligned Skills</span>
          </div>
          <p className="mt-1 text-2xl font-black text-emerald-700">{meetingCount}</p>
          <p className="text-[10px] text-emerald-600/80">Cohort matches expectations</p>
        </div>
      </div>

      {/* Chart List */}
      <div className="mt-6 max-h-[295px] overflow-y-auto pr-1">
        <div className="space-y-4">
          {skillsWithGap.map((skill) => (
            <div key={skill.skillName} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">{skill.skillName}</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  skill.gap > 20
                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                    : skill.gap > 0
                    ? "bg-amber-50 text-amber-700 border border-amber-100"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}>
                  {skill.gap > 0 
                    ? `-${Math.round(skill.gap)}% Gap` 
                    : `+${Math.round(Math.abs(skill.gap))}% Surplus`
                  }
                </span>
              </div>

              {/* Progress Comparison */}
              <div className="relative h-6 w-full rounded-md bg-slate-100/70 p-1">
                {/* Industry Target Bar (underneath/top depending on look) */}
                <div 
                  style={{ width: `${skill.reqPct}%` }}
                  className="absolute bottom-1 top-1 left-1 rounded-sm bg-slate-300 opacity-60 transition-all duration-500"
                  title="Industry Expectation"
                />
                
                {/* Cohort Average Bar */}
                <div 
                  style={{ width: `${skill.avgPct}%` }}
                  className={`absolute bottom-1 top-1 left-1 rounded-sm transition-all duration-500 ${
                    skill.gap > 20 
                      ? "bg-gradient-to-r from-rose-500 to-rose-600" 
                      : skill.gap > 0 
                      ? "bg-gradient-to-r from-amber-500 to-amber-600" 
                      : "bg-gradient-to-r from-emerald-500 to-emerald-600"
                  }`}
                  title="Student Average Proficiency"
                />

                {/* Values overlay */}
                <div className="absolute inset-0 flex items-center justify-between px-3 text-[10px] font-semibold">
                  <span className={skill.avgPct < 15 ? "text-slate-700" : "text-white drop-shadow-sm"}>Avg: {Math.round(skill.avgPct)}%</span>
                  <span className="z-10 bg-slate-800/80 px-1 py-0.5 rounded text-white text-[9px]">Target: {Math.round(skill.reqPct)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
