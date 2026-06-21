import { useEffect, useState } from "react";
import { listStudents } from "../../services/admin.service";
import { getStudentGalaxy } from "../../services/graph.service";
import { BookOpen, Compass, Search, User, UserCheck, X, Award, Terminal, ExternalLink, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function StudentDirectory() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentGalaxy, setStudentGalaxy] = useState<any>(null);
  const [loadingGalaxy, setLoadingGalaxy] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const data = await listStudents();
        setStudents(data);
      } catch (err: any) {
        setError(err.message || "Failed to load student directory");
      } finally {
        setLoading(false);
      }
    };

    void fetchStudents();
  }, []);

  const handleOpenDetails = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setStudentGalaxy(null);
    setLoadingGalaxy(true);
    try {
      const data = await getStudentGalaxy(studentId);
      setStudentGalaxy(data);
    } catch (err: any) {
      console.error("Failed to load student galaxy data:", err);
    } finally {
      setLoadingGalaxy(false);
    }
  };

  const filteredStudents = students.filter((st) => {
    const searchString = searchTerm.toLowerCase();
    const activePath = st.studentProfile?.learningPaths?.find((p: any) => p.isActive);
    return (
      st.fullName?.toLowerCase().includes(searchString) ||
      st.email?.toLowerCase().includes(searchString) ||
      st.studentProfile?.studentIdNo?.toLowerCase().includes(searchString) ||
      activePath?.role?.title?.toLowerCase().includes(searchString)
    );
  });

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading student directory...</div>;
  if (error) return <div className="text-center py-8 text-sm text-red-500">{error}</div>;

  return (
    <div className="rounded-lg border border-[#dfe3ea] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-[#edf0f5] pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-[#e7f8ef] text-[#1f845a]">
            <UserCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#17202a]">Department Students & Talents</h2>
            <p className="text-xs text-muted-foreground">Monitor student career readiness and skill graphs.</p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search name, ID, or target role"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 border-[#cfd7e3] bg-[#f7f8fa] pl-8 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-[#17202a]">
          <thead>
            <tr className="border-b border-[#cfd7e3] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 pr-4">Student</th>
              <th className="pb-3 px-4">Student ID</th>
              <th className="pb-3 px-4">Academic track</th>
              <th className="pb-3 px-4">Graduation</th>
              <th className="pb-3 px-4">Active Career Path</th>
              <th className="pb-3 pl-4">Readiness</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf0f5]">
            {filteredStudents.map((st) => {
              const profile = st.studentProfile;
              const activePath = profile?.learningPaths?.find((p: any) => p.isActive);
              return (
                <tr 
                  key={st.id} 
                  onClick={() => handleOpenDetails(st.id)} 
                  className="hover:bg-[#f7f8fa] cursor-pointer"
                >
                  <td className="py-3.5 pr-4 font-medium">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-semibold">{st.fullName}</p>
                        <p className="text-xs text-muted-foreground">{st.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                    {profile?.studentIdNo || "N/A"}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-xs text-[#17202a]">
                      <BookOpen className="size-3.5 text-muted-foreground" />
                      <span>
                        {profile?.university?.shortName || "UIU"}{" "}
                        {profile?.department?.code ? `(${profile.department.code})` : ""}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    Class of {profile?.graduationYear || "N/A"}
                  </td>
                  <td className="py-3.5 px-4">
                    {activePath?.role ? (
                      <span className="inline-flex items-center gap-1 rounded bg-[#e9f2ff] px-2 py-0.5 text-xs font-medium text-[#0c66e4]">
                        <Compass className="size-3" />
                        {activePath.role.title}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No active path</span>
                    )}
                  </td>
                  <td className="py-3.5 pl-4">
                    {activePath ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-[#edf0f5] overflow-hidden">
                          <div
                            className="h-full bg-[#1f845a]"
                            style={{ width: `${activePath.completionPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold">{activePath.completionPct}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Slide-out Student Detail Inspector */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#091e42]/40 transition-opacity">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#edf0f5] pb-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-[#17202a]">
                    {students.find((s) => s.id === selectedStudentId)?.fullName}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {students.find((s) => s.id === selectedStudentId)?.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudentId(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-[#edf0f5] hover:text-[#17202a]"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Body */}
              {loadingGalaxy ? (
                <div className="text-center py-12 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="size-6 animate-spin text-[#0c66e4]" />
                  <span>Fetching student skill graph from Neo4j...</span>
                </div>
              ) : !studentGalaxy || !studentGalaxy.nodes || studentGalaxy.nodes.length === 0 ? (
                <p className="text-center py-12 text-xs text-muted-foreground">No skill graph matches recorded for this student.</p>
              ) : (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f7f8fa] border border-[#dfe3ea] p-3 rounded-lg text-xs">
                      <span className="text-muted-foreground block">Total Mapped Skills</span>
                      <strong className="text-sm text-[#17202a]">{studentGalaxy.nodes.filter((n: any) => n.labels?.includes("Skill")).length} skills</strong>
                    </div>
                    <div className="bg-[#f7f8fa] border border-[#dfe3ea] p-3 rounded-lg text-xs">
                      <span className="text-muted-foreground block">GitHub Repositories</span>
                      <strong className="text-sm text-[#17202a]">{studentGalaxy.nodes.filter((n: any) => n.labels?.includes("Repository")).length} repos</strong>
                    </div>
                  </div>

                  {/* Skills List */}
                  <div>
                    <h4 className="text-xs font-bold text-[#17202a] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Award className="size-4 text-[#1f845a]" />
                      Skill Graph Nodes ({studentGalaxy.nodes.filter((n: any) => n.labels?.includes("Skill")).length})
                    </h4>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {studentGalaxy.nodes
                        .filter((n: any) => n.labels?.includes("Skill"))
                        .map((node: any) => (
                          <div key={node.id} className="p-2.5 bg-[#f7f8fa] border border-[#dfe3ea] rounded-lg text-xs flex justify-between items-center">
                            <div>
                              <strong className="text-[#17202a]">{node.name}</strong>
                              {node.category && (
                                <span className="text-[10px] text-gray-500 block">Category: {node.category}</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 rounded bg-[#e7f8ef] px-1.5 py-0.5 text-[10px] font-semibold text-[#1f845a]">
                                Prof: {Math.round((node.proficiency || 0.6) * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Source Code Activity */}
                  <div>
                    <h4 className="text-xs font-bold text-[#17202a] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Terminal className="size-4 text-[#0c66e4]" />
                      Ingested Repositories
                    </h4>
                    <div className="space-y-2">
                      {studentGalaxy.nodes
                        .filter((n: any) => n.labels?.includes("Repository"))
                        .map((node: any) => (
                          <div key={node.id} className="p-3 bg-[#deebff]/20 border border-[#deebff] rounded-lg text-xs">
                            <span className="font-semibold text-[#0747a6] flex items-center gap-1">
                              <ExternalLink className="size-3.5" />
                              {node.name}
                            </span>
                            {node.description && <p className="text-[10px] text-gray-500 mt-1">{node.description}</p>}
                            {node.language && (
                              <span className="mt-2 inline-block bg-[#deebff] text-[#0747a6] px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                {node.language}
                              </span>
                            )}
                          </div>
                        ))}
                      {studentGalaxy.nodes.filter((n: any) => n.labels?.includes("Repository")).length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No active GitHub repositories linked</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => setSelectedStudentId(null)}
              variant="outline"
              className="mt-6 w-full border-[#cfd7e3] text-[#17202a] h-9 text-xs"
            >
              Close Inspector
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
