import { useEffect, useState } from "react";
import { 
  listStudents, getIndustryGap, getMissingSkills, 
  IndustryGapItem, MissingSkillItem 
} from "../../services/admin.service";
import { 
  TrendingUp, AlertTriangle, CheckCircle2, GraduationCap, 
  Layers, BarChart2, ShieldAlert, Award 
} from "lucide-react";


export function CurriculumAnalytics() {
  const [students, setStudents] = useState<any[]>([]);
  const [industryGaps, setIndustryGaps] = useState<IndustryGapItem[]>([]);
  const [missingSkills, setMissingSkills] = useState<MissingSkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsData, gapData, missingData] = await Promise.all([
          listStudents(),
          getIndustryGap(),
          getMissingSkills()
        ]);
        setStudents(studentsData);
        setIndustryGaps(gapData);
        setMissingSkills(missingData);
      } catch (err: any) {
        setError(err.message || "Failed to load curriculum analytics");
      } finally {
        setLoading(false);
      }
    };
    void fetchData();
  }, []);

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading curriculum metrics...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  // 1. Calculate class-level statistics
  const classStats = (() => {
    const cohorts: Record<string, { total: number; sum: number }> = {};
    students.forEach((st) => {
      const year = st.studentProfile?.graduationYear || "Unknown";
      const activePath = st.studentProfile?.learningPaths?.find((p: any) => p.isActive);
      const pct = activePath ? activePath.completionPct : 0;
      
      if (!cohorts[year]) {
        cohorts[year] = { total: 0, sum: 0 };
      }
      cohorts[year].total += 1;
      cohorts[year].sum += pct;
    });

    return Object.entries(cohorts)
      .map(([cohort, val]) => ({
        cohort: cohort === "Unknown" ? "Unassigned Cohort" : `Class of ${cohort}`,
        count: val.total,
        averageReadiness: Math.round(val.sum / val.total)
      }))
      .sort((a, b) => b.cohort.localeCompare(a.cohort));
  })();

  // 2. Identify curriculum deficits (industry requirement >= 0.6 but student average proficiency < 30% / 0.3)
  const curriculumDeficits = industryGaps.filter(
    (gap) => gap.industryRequired >= 0.6 && gap.studentAverage < 0.3
  );

  return (
    <div className="space-y-6">
      {/* Overview stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Students Monitored */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohort Averages</span>
            <div className="mt-2 space-y-2">
              {classStats.length === 0 ? (
                <p className="text-sm text-gray-500">No student tracks recorded</p>
              ) : (
                classStats.slice(0, 3).map((stat) => (
                  <div key={stat.cohort} className="flex items-center gap-4 text-xs">
                    <span className="font-semibold text-[#17202a] w-20">{stat.cohort}</span>
                    <div className="w-24 h-1.5 rounded-full bg-[#edf0f5] overflow-hidden">
                      <div className="h-full bg-[#0c66e4]" style={{ width: `${stat.averageReadiness}%` }} />
                    </div>
                    <span className="font-bold text-[#17202a]">{stat.averageReadiness}% Avg</span>
                    <span className="text-gray-400">({stat.count} students)</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="grid size-12 place-items-center rounded-lg bg-[#e9f2ff] text-[#0c66e4]">
            <GraduationCap className="size-6" />
          </div>
        </div>

        {/* Global Track Progress */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Deficits</span>
            <h3 className="mt-1 text-3xl font-bold text-[#ca3521]">
              {curriculumDeficits.length}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Skills missing in critical industry roles</p>
          </div>
          <div className="grid size-12 place-items-center rounded-lg bg-[#ffebe6] text-[#ca3521]">
            <ShieldAlert className="size-6" />
          </div>
        </div>

        {/* Mapped Skills Count */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Missing Competency</span>
            <h3 className="mt-1 text-xl font-bold text-[#17202a]">
              {missingSkills[0]?.name || "N/A"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Required by {missingSkills[0]?.count || 0} student learning paths
            </p>
          </div>
          <div className="grid size-12 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
            <Award className="size-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Deficits Alert Panel */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-4">
            <div className="grid size-8 place-items-center rounded-lg bg-[#fff4e5] text-[#ca3521]">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17202a]">Curriculum Deficit Warning Panel</h2>
              <p className="text-[11px] text-muted-foreground">Flags skills required by industry roles but showing low student proficiency.</p>
            </div>
          </div>

          <div className="space-y-3">
            {curriculumDeficits.length === 0 ? (
              <div className="flex items-center gap-2 p-3 bg-[#e7f8ef] rounded-lg border border-[#e3fcef] text-[#006644] text-xs">
                <CheckCircle2 className="size-4" />
                <span>Excellent! No critical curriculum deficits detected. Student proficiencies align with industry needs.</span>
              </div>
            ) : (
              curriculumDeficits.map((gap, idx) => (
                <div key={idx} className="p-3 bg-[#ffebe6]/40 rounded-lg border border-[#ffebe6] flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <span className="font-semibold text-[#ca3521] block">{gap.skillName}</span>
                    <span className="text-gray-500">
                      Target Role: <strong className="text-gray-700">{gap.roleTitle}</strong>
                    </span>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Industry Need</span>
                      <span className="font-bold text-[#17202a]">{Math.round(gap.industryRequired * 100)}%</span>
                    </div>
                    <div>
                      <span className="text-[#ca3521] block text-[10px] uppercase">Student Avg</span>
                      <span className="font-bold text-[#ca3521]">{Math.round(gap.studentAverage * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Most Needed Missing Skills */}
        <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-[#edf0f5] pb-4 mb-4">
            <div className="grid size-8 place-items-center rounded-lg bg-[#deebff] text-[#0747a6]">
              <Layers className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#17202a]">Most Needed Skills</h2>
              <p className="text-[11px] text-muted-foreground">Required skills currently missing from student portfolios.</p>
            </div>
          </div>

          <div className="space-y-3">
            {missingSkills.slice(0, 6).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs border-b border-[#edf0f5] pb-2 last:border-0 last:pb-0">
                <span className="font-medium text-[#17202a]">{item.name}</span>
                <span className="rounded-full bg-[#deebff] px-2 py-0.5 text-[10px] font-semibold text-[#0747a6]">
                  {item.count} paths missing
                </span>
              </div>
            ))}
            {missingSkills.length === 0 && (
              <p className="text-center text-xs text-gray-500 py-4">No missing skill tracking recorded</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
