import { useEffect, useState, useMemo, useRef } from "react";
import { getSkillTrends, SkillTrendItem } from "../../services/admin.service";
import * as d3 from "d3";
import { Loader2, TrendingUp, HelpCircle } from "lucide-react";
import { useAuthStore } from "../../store/auth.store";

export function TrendLineChart() {
  const [data, setData] = useState<SkillTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [hoveredPoint, setHoveredPoint] = useState<{
    skillName: string;
    date: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(500);
  const height = 240;

  const { academicProfile } = useAuthStore();
  const universityName = academicProfile?.universityName;

  // Track container width to make chart fully responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await getSkillTrends();
        setData(res);

        // Extract top 5 skills based on overall final count
        const skillTotals: Record<string, number> = {};
        res.forEach((item) => {
          skillTotals[item.name] = (skillTotals[item.name] || 0) + item.count;
        });
        const topSkills = Object.entries(skillTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name]) => name);

        setSelectedSkills(topSkills);
        setError(null);
      } catch (err) {
        console.error("Error fetching skill trends:", err);
        setError("Failed to load skill trend data.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Format data for plotting
  const chartData = useMemo(() => {
    if (data.length === 0) return { dates: [], series: [] };

    // Unique sorted dates
    const dates = Array.from(new Set(data.map((d) => d.date))).sort();

    // Group items by skill name
    const grouped: Record<string, Record<string, number>> = {};
    data.forEach((item) => {
      if (!grouped[item.name]) {
        grouped[item.name] = {};
      }
      grouped[item.name][item.date] = item.count;
    });

    // Generate full timeline for selected skills
    const series = selectedSkills.map((skillName) => {
      const values = dates.map((date) => {
        const count = grouped[skillName]?.[date] || 0;
        return { date, count };
      });
      return { skillName, values };
    });

    return { dates, series };
  }, [data, selectedSkills]);

  // Color mapping for top series
  const colorMap = useMemo(() => {
    const colors = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];
    const map: Record<string, string> = {};
    selectedSkills.forEach((skill, i) => {
      map[skill] = colors[i % colors.length];
    });
    return map;
  }, [selectedSkills]);

  // D3 calculations
  const svgElements = useMemo(() => {
    if (chartData.dates.length === 0 || chartData.series.length === 0) return null;

    const margin = { top: 20, right: 30, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Y Scale
    const maxVal = d3.max(chartData.series.flatMap((s) => s.values.map((v) => v.count))) || 1;
    const yScale = d3.scaleLinear().domain([0, maxVal * 1.1]).range([chartHeight, 0]);

    // X Scale (using points or time scale)
    const xScale = d3.scalePoint().domain(chartData.dates).range([0, chartWidth]);

    // D3 Line Generator
    const lineGen = d3
      .line<{ date: string; count: number }>()
      .x((d) => xScale(d.date) || 0)
      .y((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // D3 Area Generator
    const areaGen = d3
      .area<{ date: string; count: number }>()
      .x((d) => xScale(d.date) || 0)
      .y0(chartHeight)
      .y1((d) => yScale(d.count))
      .curve(d3.curveMonotoneX);

    // Y-Axis Ticks
    const yTicks = yScale.ticks(5);

    // X-Axis Ticks (Limit label clutter on small screens)
    const step = Math.ceil(chartData.dates.length / 6);
    const xTicks = chartData.dates.filter((_, idx) => idx % step === 0);

    return {
      margin,
      chartWidth,
      chartHeight,
      xScale,
      yScale,
      lineGen,
      areaGen,
      yTicks,
      xTicks,
    };
  }, [chartData, width]);

  // Helper to format date display (e.g. "2026-05" -> "May 26")
  const formatMonth = (dateStr: string) => {
    try {
      const [year, month] = dateStr.split("-");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const mName = months[parseInt(month, 10) - 1] || month;
      return `${mName} ${year.slice(-2)}`;
    } catch {
      return dateStr;
    }
  };

  // Get list of all available skills for checkboxes
  const allSkillsList = useMemo(() => {
    const list = Array.from(new Set(data.map((d) => d.name)));
    const skillTotals: Record<string, number> = {};
    data.forEach((item) => {
      skillTotals[item.name] = (skillTotals[item.name] || 0) + item.count;
    });
    return list.sort((a, b) => (skillTotals[b] || 0) - (skillTotals[a] || 0));
  }, [data]);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      if (selectedSkills.length > 1) {
        setSelectedSkills(selectedSkills.filter((s) => s !== skill));
      }
    } else {
      if (selectedSkills.length < 6) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="mt-3 text-sm text-slate-500">Loading adoption trends...</p>
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <HelpCircle className="h-10 w-10 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">{error || "No skill trend data available."}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          Trends
        </span>
        <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
          {universityName ? `${universityName} Skill Trends` : "Cohort Skill Trends"}
        </h3>
        <p className="text-xs text-slate-500">
          Historical monthly growth tracking of skill acquisitions for {universityName || "the cohort"}.
        </p>
      </div>

      {/* Selector pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 self-center mr-1">Plot:</span>
        {allSkillsList.slice(0, 10).map((skill) => {
          const isSelected = selectedSkills.includes(skill);
          const color = colorMap[skill] || "#cbd5e1";
          return (
            <button
              key={skill}
              onClick={() => toggleSkill(skill)}
              style={{
                borderColor: isSelected ? color : "#e2e8f0",
                backgroundColor: isSelected ? `${color}12` : "#f8fafc",
                color: isSelected ? color : "#475569"
              }}
              className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold transition-all hover:brightness-95"
            >
              {skill}
            </button>
          );
        })}
      </div>

      {/* SVG Plot */}
      <div className="relative mt-6 flex-1 min-h-[240px]">
        {svgElements && (
          <svg width={width} height={height} className="overflow-visible select-none">
            {/* Gradients */}
            <defs>
              {selectedSkills.map((skill) => (
                <linearGradient
                  key={`grad-${skill}`}
                  id={`grad-${skill.replace(/\s+/g, "-")}`}
                  x1="0" y1="0" x2="0" y2="1"
                >
                  <stop offset="0%" stopColor={colorMap[skill]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={colorMap[skill]} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>

            <g transform={`translate(${svgElements.margin.left}, ${svgElements.margin.top})`}>
              {/* Y Axis Gridlines */}
              {svgElements.yTicks.map((tick) => (
                <g key={`yGrid-${tick}`} transform={`translate(0, ${svgElements.yScale(tick)})`}>
                  <line x1={0} x2={svgElements.chartWidth} stroke="#f1f5f9" strokeWidth={1} />
                  <text x={-10} dy="0.32em" textAnchor="end" className="text-[10px] font-semibold text-slate-400">
                    {tick}
                  </text>
                </g>
              ))}

              {/* X Axis Gridlines & Text */}
              {svgElements.xTicks.map((tick) => (
                <g key={`xGrid-${tick}`} transform={`translate(${svgElements.xScale(tick) || 0}, 0)`}>
                  <line y1={0} y2={svgElements.chartHeight} stroke="#f1f5f9" strokeWidth={1} />
                  <text
                    y={svgElements.chartHeight + 18}
                    textAnchor="middle"
                    className="text-[10px] font-semibold text-slate-400"
                  >
                    {formatMonth(tick)}
                  </text>
                </g>
              ))}

              {/* Chart lines and areas */}
              {chartData.series.map(({ skillName, values }) => {
                const color = colorMap[skillName] || "#cbd5e1";
                const linePath = svgElements.lineGen(values);
                const areaPath = svgElements.areaGen(values);

                return (
                  <g key={`series-${skillName}`}>
                    {/* Area under line */}
                    {areaPath && (
                      <path
                        d={areaPath}
                        fill={`url(#grad-${skillName.replace(/\s+/g, "-")})`}
                      />
                    )}
                    {/* The Line */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    )}

                    {/* Circles on data points */}
                    {values.map((v) => {
                      const cx = svgElements.xScale(v.date) || 0;
                      const cy = svgElements.yScale(v.count);
                      return (
                        <circle
                          key={`point-${skillName}-${v.date}`}
                          cx={cx}
                          cy={cy}
                          r={3.5}
                          fill="white"
                          stroke={color}
                          strokeWidth={2}
                          className="cursor-pointer hover:r-5 transition-all duration-150"
                          onMouseEnter={() => {
                            setHoveredPoint({
                              skillName,
                              date: v.date,
                              count: v.count,
                              x: cx + svgElements.margin.left,
                              y: cy + svgElements.margin.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            style={{
              position: "absolute",
              left: `${hoveredPoint.x - 70}px`,
              top: `${hoveredPoint.y - 65}px`,
              zIndex: 50,
            }}
            className="pointer-events-none w-36 rounded-lg bg-slate-950 p-2 text-white shadow-xl animate-fade-in"
          >
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
              {formatMonth(hoveredPoint.date)}
            </div>
            <div className="text-xs font-bold truncate mt-0.5">{hoveredPoint.skillName}</div>
            <div className="mt-1 text-[11px] text-emerald-300 font-bold">
              {hoveredPoint.count} Students
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
