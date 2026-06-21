import { useEffect, useState } from "react";
import { getSkillHeatmap, SkillHeatmapItem } from "../../services/admin.service";
import { Loader2, Flame, Award, HelpCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

export function SkillHeatmap() {
  const [data, setData] = useState<SkillHeatmapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [hoveredSkill, setHoveredSkill] = useState<{ item: SkillHeatmapItem; x: number; y: number } | null>(null);

  const { academicProfile } = useAuthStore();
  const universityName = academicProfile?.universityName;

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await getSkillHeatmap();
        setData(res);
        setError(null);
      } catch (err) {
        console.error("Error fetching skill heatmap:", err);
        setError("Failed to load skill heatmap data.");
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
        <p className="mt-3 text-sm text-slate-500">Loading student skill distribution...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <HelpCircle className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error || "No skill distribution data available."}</p>
      </div>
    );
  }

  // Categories extraction
  const categories = ["All", ...Array.from(new Set(data.map((item) => item.category)))];

  // Group by category
  const groupedData: Record<string, SkillHeatmapItem[]> = {};
  data.forEach((item) => {
    if (!groupedData[item.category]) {
      groupedData[item.category] = [];
    }
    groupedData[item.category].push(item);
  });

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Helper to determine tailwind style based on count ratio
  const getHeatColor = (count: number) => {
    const ratio = count / maxCount;
    if (count === 0) return "bg-slate-50 text-slate-400 border border-slate-100";
    if (ratio <= 0.25) return "bg-indigo-50/70 text-indigo-600 border border-indigo-100/50 hover:bg-indigo-50 hover:border-indigo-200";
    if (ratio <= 0.5) return "bg-indigo-100/80 text-indigo-700 border border-indigo-200/50 hover:bg-indigo-100 hover:border-indigo-300";
    if (ratio <= 0.75) return "bg-indigo-200 text-indigo-800 border border-indigo-300/50 hover:bg-indigo-200/90 hover:border-indigo-400";
    return "bg-indigo-600 text-white font-medium border border-indigo-700 hover:bg-indigo-700";
  };

  const handleMouseMove = (e: React.MouseEvent, item: SkillHeatmapItem) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredSkill({
      item,
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top - 10 + window.scrollY,
    });
  };

  const filteredCategories = selectedCategory === "All" 
    ? Object.keys(groupedData) 
    : [selectedCategory];

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <Flame className="h-3.5 w-3.5 text-indigo-600" />
            Coverage
          </span>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
            {universityName ? `${universityName} Skill Heatmap` : "Student Skill Heatmap"}
          </h3>
          <p className="text-xs text-slate-500">
            Distribution of active skill proficiencies across {universityName || "student"} cohort.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span>Few</span>
          <span className="h-3 w-3 rounded-sm bg-indigo-50/70 border border-indigo-100/50"></span>
          <span className="h-3 w-3 rounded-sm bg-indigo-100/80 border border-indigo-200/50"></span>
          <span className="h-3 w-3 rounded-sm bg-indigo-200 border border-indigo-300/50"></span>
          <span className="h-3 w-3 rounded-sm bg-indigo-600 border border-indigo-700"></span>
          <span>Many</span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mt-4 flex flex-wrap gap-1.5 pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              selectedCategory === cat
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      <div className="mt-4 max-h-[380px] overflow-y-auto pr-1">
        <div className="space-y-6">
          {filteredCategories.map((catName) => {
            const skills = groupedData[catName] || [];
            return (
              <div key={catName} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {catName}
                </h4>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.name}
                      onMouseEnter={(e) => handleMouseMove(e, skill)}
                      onMouseMove={(e) => handleMouseMove(e, skill)}
                      onMouseLeave={() => setHoveredSkill(null)}
                      className={`relative flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-all duration-200 cursor-help ${getHeatColor(
                        skill.count
                      )}`}
                    >
                      <span className="truncate pr-1 font-medium">{skill.name}</span>
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-black/10 px-1 text-[9px] font-bold">
                        {skill.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip Portal */}
      {hoveredSkill && (
        <div
          style={{
            position: "absolute",
            left: `${hoveredSkill.x - 100}px`,
            top: `${hoveredSkill.y - 65}px`,
            zIndex: 50,
          }}
          className="pointer-events-none w-48 rounded-lg bg-slate-950 p-2 text-white shadow-xl animate-fade-in"
        >
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            {hoveredSkill.item.category}
          </div>
          <div className="text-xs font-bold mt-0.5">{hoveredSkill.item.name}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-indigo-300">
            <Award className="h-3.5 w-3.5" />
            <span>{hoveredSkill.item.count} students proficient</span>
          </div>
        </div>
      )}
    </div>
  );
}
