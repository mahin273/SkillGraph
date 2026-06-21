import { useEffect, useState } from "react";
import { listStudents, getAllSkills, saveTeamAssignments, loadTeamAssignments } from "../../services/admin.service";
import { getStudentSkills, getStudentsSkillsBulk } from "../../services/graph.service";
import { 
  Users, Sparkles, Plus, Trash2, ShieldCheck, 
  HelpCircle, UserPlus, RefreshCw, BarChart, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentNode {
  id: string;
  fullName: string;
  email: string;
  studentIdNo?: string;
  skills: Array<{ name: string; category: string; proficiency: number }>;
  scores: Record<string, number>;
}

interface Team {
  id: string;
  name: string;
  members: StudentNode[];
  maxMembers?: number;
}

const PROJECT_TEMPLATES = [
  {
    name: "Full Stack Web Portal",
    skills: ["React", "Node.js", "PostgreSQL", "TypeScript"]
  },
  {
    name: "Machine Learning Pipeline",
    skills: ["Python", "TensorFlow", "PyTorch", "Pandas"]
  },
  {
    name: "Robotics & IoT Controller",
    skills: ["Linux", "Kotlin", "Python"]
  },
  {
    name: "Mobile App Development",
    skills: ["Swift", "Kotlin", "React Native"]
  },
  {
    name: "Cloud & DevOps Infrastructure",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform"]
  }
];

export function TeamBuilder() {
  const [students, setStudents] = useState<StudentNode[]>([]);
  const [unassigned, setUnassigned] = useState<StudentNode[]>([]);
  const [teams, setTeams] = useState<Team[]>([
    { id: "team-1", name: "Capstone Team 1", members: [], maxMembers: 4 },
    { id: "team-2", name: "Capstone Team 2", members: [], maxMembers: 4 }
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Local state to track which student is being dragged
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [draggedSource, setDraggedSource] = useState<string | null>(null);
  const [savingTeams, setSavingTeams] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Dynamic project skills matching state
  const [availableSkills, setAvailableSkills] = useState<Array<{ id: string; name: string; category?: string }>>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React", "Node.js", "PostgreSQL", "TypeScript"]);
  const [selectedProjectProfile, setSelectedProjectProfile] = useState("Full Stack Web Portal");

  // Load available skills list
  useEffect(() => {
    async function loadAllSkills() {
      try {
        const skillsList = await getAllSkills();
        setAvailableSkills(skillsList);
      } catch (err) {
        console.error("Failed to load skills list", err);
      }
    }
    void loadAllSkills();
  }, []);

  const onSaveTeams = async () => {
    try {
      setSavingTeams(true);
      const payload = teams.map((t) => ({
        name: t.name,
        maxMembers: t.maxMembers || 4,
        targetSkills: selectedSkills,
        memberUserIds: t.members.map((m) => m.id)
      }));
      await saveTeamAssignments(payload);
      alert("Assignments saved successfully in database!");
    } catch (err: any) {
      alert("Failed to save assignments: " + (err.message || err));
    } finally {
      setSavingTeams(false);
    }
  };

  const onLoadTeams = async () => {
    try {
      setLoadingTeams(true);
      const savedTeams = await loadTeamAssignments();
      if (savedTeams.length === 0) {
        alert("No saved assignments found for your account.");
        return;
      }

      // Restore selectedSkills from saved assignments
      if (savedTeams.length > 0 && Array.isArray(savedTeams[0].targetSkills) && savedTeams[0].targetSkills.length > 0) {
        setSelectedSkills(savedTeams[0].targetSkills);
        setSelectedProjectProfile(""); // Custom stack since loaded
      }

      const mapped = savedTeams.map((t) => {
        const fullMembers = t.members.map((m: any) => {
          const match = students.find((s) => s.id === m.id);
          return match || m;
        });
        return {
          id: t.id,
          name: t.name,
          maxMembers: t.maxMembers,
          members: fullMembers
        };
      });

      const assignedIds = new Set(mapped.flatMap((t: any) => t.members.map((m: any) => m.id)));
      const filteredUnassigned = students.filter((s) => !assignedIds.has(s.id));

      setTeams(mapped);
      setUnassigned(filteredUnassigned);
      alert("Assignments loaded successfully!");
    } catch (err: any) {
      alert("Failed to load assignments: " + (err.message || err));
    } finally {
      setLoadingTeams(false);
    }
  };

  const fetchAndProcessStudents = async () => {
    try {
      setLoading(true);
      setError(undefined);
      const rawStudents = await listStudents();
      
      if (rawStudents.length === 0) {
        setStudents([]);
        setUnassigned([]);
        return;
      }

      // Fetch all graph skills in a single bulk request
      const studentIds = rawStudents.map((st) => st.id);
      const skillsResponse = await getStudentsSkillsBulk(studentIds);
      const skillsByStudent = skillsResponse.skills || {};

      const processed: StudentNode[] = rawStudents.map((st) => {
        const graphSkills = skillsByStudent[st.id] || [];
        const skillsMapped = graphSkills.map((sk: any) => {
          let proficiency = sk.proficiency || 0.5;
          return {
            name: sk.name,
            category: sk.category || "Uncategorized",
            proficiency
          };
        });

        return {
          id: st.id,
          fullName: st.fullName,
          email: st.email,
          studentIdNo: st.studentProfile?.studentIdNo,
          skills: skillsMapped,
          scores: {}
        };
      });

      setStudents(processed);
      setUnassigned(processed);
    } catch (err: any) {
      setError(err.message || "Failed to load students list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAndProcessStudents();
  }, []);

  const handleAddTeam = () => {
    const nextNum = teams.length + 1;
    setTeams([...teams, { id: `team-${Date.now()}`, name: `Capstone Team ${nextNum}`, members: [], maxMembers: 4 }]);
  };

  const handleUpdateTeamLimit = (teamId: string, limitStr: string) => {
    const maxMembers = limitStr === "unlimited" ? undefined : parseInt(limitStr, 10);
    setTeams(
      teams.map((t) => {
        if (t.id === teamId) {
          return { ...t, maxMembers };
        }
        return t;
      })
    );
  };

  const handleDeleteTeam = (teamId: string) => {
    const teamToDelete = teams.find((t) => t.id === teamId);
    if (!teamToDelete) return;
    
    // Return members to unassigned
    setUnassigned([...unassigned, ...teamToDelete.members]);
    setTeams(teams.filter((t) => t.id !== teamId));
  };

  // AI Auto-Balancing Heuristic for dynamic project target skills
  const handleAutoBalance = () => {
    if (students.length === 0) return;
    if (selectedSkills.length === 0) {
      alert("Please select at least one target skill to balance teams.");
      return;
    }

    // Reset teams to empty
    const newTeams = teams.map((t) => ({ ...t, members: [] as StudentNode[] }));
    
    const getScore = (student: StudentNode, skill: string) => {
      const match = student.skills.find(s => s.name.toLowerCase() === skill.toLowerCase());
      return match ? match.proficiency : 0;
    };

    // Sort students by their maximum capability score in selectedSkills
    const sorted = [...students].sort((a, b) => {
      const maxA = Math.max(...selectedSkills.map(s => getScore(a, s)), 0);
      const maxB = Math.max(...selectedSkills.map(s => getScore(b, s)), 0);
      return maxB - maxA;
    });

    const unassignedStudents: StudentNode[] = [];

    sorted.forEach((student) => {
      // Find student's primary skill among selectedSkills
      let primarySkill = selectedSkills[0];
      let maxScore = getScore(student, primarySkill);

      selectedSkills.forEach((skill) => {
        const score = getScore(student, skill);
        if (score > maxScore) {
          primarySkill = skill;
          maxScore = score;
        }
      });

      // Find the team with the lowest aggregate score in the student's primary skill
      let bestTeamIdx = -1;
      let minScore = Infinity;

      newTeams.forEach((team, idx) => {
        // Respect team limits
        const limit = team.maxMembers === undefined ? Infinity : team.maxMembers;
        if (team.members.length >= limit) return;

        // Calculate cumulative score of the team in this primary skill
        const teamScore = team.members.reduce((sum, mem) => sum + getScore(mem, primarySkill), 0);
        const sizePenalty = team.members.length * 5; 
        const totalEvaluationScore = teamScore + sizePenalty;

        if (totalEvaluationScore < minScore) {
          minScore = totalEvaluationScore;
          bestTeamIdx = idx;
        }
      });

      if (bestTeamIdx !== -1) {
        newTeams[bestTeamIdx].members.push(student);
      } else {
        unassignedStudents.push(student);
      }
    });

    setTeams(newTeams);
    setUnassigned(unassignedStudents);
  };

  const getTeamStats = (members: StudentNode[], targetSkills: string[]) => {
    if (members.length === 0) {
      const defaultStats: Record<string, number> = {};
      targetSkills.forEach(s => { defaultStats[s] = 0; });
      return defaultStats;
    }
    
    const sums: Record<string, number> = {};
    targetSkills.forEach(s => { sums[s] = 0; });

    members.forEach(mem => {
      targetSkills.forEach(skill => {
        const match = mem.skills.find(s => s.name.toLowerCase() === skill.toLowerCase());
        sums[skill] += match ? match.proficiency : 0;
      });
    });

    const stats: Record<string, number> = {};
    const size = members.length;
    targetSkills.forEach(skill => {
      stats[skill] = Math.min(100, Math.round((sums[skill] / size) * 100));
    });

    return stats;
  };

  // NATIVE HTML5 DRAG AND DROP
  const onDragStart = (e: React.DragEvent, id: string, source: string) => {
    setDraggedStudentId(id);
    setDraggedSource(source);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetTeamId: string | "unassigned") => {
    e.preventDefault();
    if (!draggedStudentId || !draggedSource) return;
    
    // If dropping into a team, check if that team is already full
    if (targetTeamId !== "unassigned") {
      const targetTeam = teams.find((t) => t.id === targetTeamId);
      if (targetTeam) {
        const limit = targetTeam.maxMembers === undefined ? Infinity : targetTeam.maxMembers;
        if (targetTeam.members.length >= limit) {
          alert(`Cannot add member. ${targetTeam.name} has reached the maximum size of ${limit} members.`);
          setDraggedStudentId(null);
          setDraggedSource(null);
          return;
        }
      }
    }

    // Find the student object
    let studentObj: StudentNode | undefined;
    if (draggedSource === "unassigned") {
      studentObj = unassigned.find((s) => s.id === draggedStudentId);
    } else {
      const sourceTeam = teams.find((t) => t.id === draggedSource);
      studentObj = sourceTeam?.members.find((s) => s.id === draggedStudentId);
    }

    if (!studentObj) return;

    // 1. Remove from source
    if (draggedSource === "unassigned") {
      setUnassigned(unassigned.filter((s) => s.id !== draggedStudentId));
    } else {
      setTeams(
        teams.map((t) => {
          if (t.id === draggedSource) {
            return { ...t, members: t.members.filter((s) => s.id !== draggedStudentId) };
          }
          return t;
        })
      );
    }

    // 2. Add to target
    if (targetTeamId === "unassigned") {
      setUnassigned([...unassigned, studentObj]);
    } else {
      setTeams(
        teams.map((t) => {
          if (t.id === targetTeamId) {
            return { ...t, members: [...t.members, studentObj!] };
          }
          return t;
        })
      );
    }

    setDraggedStudentId(null);
    setDraggedSource(null);
  };

  const handleSelectProjectProfile = (profileName: string) => {
    setSelectedProjectProfile(profileName);
    const template = PROJECT_TEMPLATES.find((t) => t.name === profileName);
    if (template) {
      setSelectedSkills(template.skills);
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
    setSelectedProjectProfile("");
  };

  const handleAddSkill = (skill: string) => {
    if (!skill) return;
    setSelectedSkills(prev => [...prev, skill]);
    setSelectedProjectProfile("");
  };

  return (
    <div className="space-y-6">
      {/* KPI Alert */}
      <div className="flex flex-col gap-4 bg-white p-5 border border-[#dfe3ea] rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#17202a] flex items-center gap-1.5">
            <Users className="size-5 text-[#0c66e4]" />
            AI Capstone Team Builder & Balancer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Distribute students into balanced project groups based on their technical profiles. Use drag-and-drop to adjust members manually.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Button
            onClick={handleAutoBalance}
            className="flex items-center gap-1.5 h-8 bg-[#0c66e4] text-white hover:bg-[#0055cc] text-xs px-3.5"
          >
            <Sparkles className="size-3.5" />
            AI Auto-Balance
          </Button>
          <Button
            onClick={handleAddTeam}
            variant="outline"
            className="h-8 border-[#cfd7e3] text-[#17202a] text-xs px-3"
          >
            <Plus className="size-3.5 mr-1" />
            Add Team
          </Button>
          <Button
            onClick={onSaveTeams}
            disabled={savingTeams || teams.length === 0}
            className="flex items-center gap-1.5 h-8 bg-emerald-600 text-white hover:bg-emerald-700 text-xs px-3.5"
          >
            {savingTeams ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save Assignments
          </Button>
          <Button
            onClick={onLoadTeams}
            disabled={loadingTeams}
            variant="outline"
            className="flex items-center gap-1.5 h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs px-3"
          >
            {loadingTeams ? <RefreshCw className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Load Saved
          </Button>
          <Button
            onClick={fetchAndProcessStudents}
            variant="outline"
            className="h-8 border-[#cfd7e3] text-gray-500"
          >
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-start gap-2.5">
          <span className="text-base">⚠️</span>
          <div>
            <p className="font-semibold text-xs uppercase tracking-wider">Error Loading Students</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Project Requirements & Tech Stack Configuration */}
      <div className="bg-white p-5 border border-[#dfe3ea] rounded-lg shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#17202a] uppercase tracking-wider">
          Project Focus & Technology Stack
        </h3>
        
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Project Template
            </label>
            <select
              value={selectedProjectProfile}
              onChange={(e) => handleSelectProjectProfile(e.target.value)}
              className="h-9 rounded-lg border border-[#cfd7e3] bg-white px-3 text-sm text-[#17202a] shadow-sm outline-none focus:border-[#0c66e4]"
            >
              <option value="">-- Custom Stack --</option>
              {PROJECT_TEMPLATES.map((tpl) => (
                <option key={tpl.name} value={tpl.name}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Target Skills / Technologies (Dynamically Balanced)
            </label>
            <div className="flex flex-wrap gap-1.5 items-center p-1.5 min-h-[36px] rounded-lg border border-[#cfd7e3] bg-white shadow-sm">
              {selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1 bg-[#f0f4f9] text-[#0c66e4] text-xs font-semibold px-2 py-0.5 rounded"
                >
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500 font-bold ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
              
              <select
                value=""
                onChange={(e) => handleAddSkill(e.target.value)}
                className="border-none bg-transparent text-xs text-gray-500 outline-none cursor-pointer py-0.5"
              >
                <option value="">+ Add Skill...</option>
                {availableSkills
                  .filter((sk) => !selectedSkills.includes(sk.name))
                  .map((sk) => (
                    <option key={sk.id} value={sk.name}>
                      {sk.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
        {/* Unassigned Students Pool */}
        <div 
          className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm space-y-4 lg:col-span-1 min-h-[500px]"
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, "unassigned")}
        >
          <h3 className="text-xs font-bold text-[#17202a] uppercase tracking-wider pb-2 border-b border-[#edf0f5]">
            Unassigned Pool ({loading ? "..." : unassigned.length})
          </h3>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <RefreshCw className="size-6 text-[#0c66e4] animate-spin" />
                <span className="text-xs text-muted-foreground">Loading student profiles & skills...</span>
              </div>
            ) : error ? (
              <p className="text-center text-xs text-red-500 py-6">{error}</p>
            ) : unassigned.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">All students assigned to teams.</p>
            ) : (
              unassigned.map((student) => (
                <div
                  key={student.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, student.id, "unassigned")}
                  className="p-3 bg-[#f7f8fa] border border-[#dfe3ea] rounded-lg hover:border-[#0c66e4] cursor-grab transition-all"
                >
                  <p className="text-xs font-semibold text-[#17202a]">{student.fullName}</p>
                  <p className="text-[10px] text-gray-400">{student.studentIdNo || "No ID"}</p>
                  
                  {/* Dynamic Specialties Indicators */}
                  <div className="flex flex-wrap gap-1 mt-2 text-[9px]">
                    {selectedSkills.map((skill) => {
                      const score = Math.round((student.skills.find(s => s.name.toLowerCase() === skill.toLowerCase())?.proficiency || 0) * 10);
                      if (score === 0) return null;
                      return (
                        <span key={skill} className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                          {skill}: {score}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Capstone Teams Panel */}
        <div className="lg:col-span-3 grid gap-6 sm:grid-cols-2">
          {teams.map((team) => {
            const stats = getTeamStats(team.members, selectedSkills);
            return (
              <div
                key={team.id}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, team.id)}
                className="rounded-lg border border-[#dfe3ea] bg-white p-5 shadow-sm flex flex-col justify-between min-h-[250px]"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[#edf0f5] pb-2 mb-4">
                    <h3 className="text-xs font-bold text-[#17202a] uppercase tracking-wider">
                      {team.name} ({team.members.length}/{team.maxMembers === undefined ? "∞" : team.maxMembers})
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={team.maxMembers === undefined ? "unlimited" : team.maxMembers.toString()}
                        onChange={(e) => handleUpdateTeamLimit(team.id, e.target.value)}
                        className="h-6 rounded border border-[#cfd7e3] bg-white px-1 text-[10px] font-medium text-[#17202a] outline-none focus:border-[#0c66e4]"
                      >
                        <option value="unlimited">Limit: ∞</option>
                        <option value="2">Limit: 2</option>
                        <option value="3">Limit: 3</option>
                        <option value="4">Limit: 4</option>
                        <option value="5">Limit: 5</option>
                        <option value="6">Limit: 6</option>
                        <option value="7">Limit: 7</option>
                        <option value="8">Limit: 8</option>
                      </select>
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="text-gray-400 hover:text-[#ca3521] ml-1"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="space-y-2 mb-6">
                    {team.members.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-[#cfd7e3] rounded-lg text-xs text-gray-400">
                        Drag students here or auto-balance
                      </div>
                    ) : (
                      team.members.map((member) => (
                        <div
                          key={member.id}
                          draggable
                          onDragStart={(e) => onDragStart(e, member.id, team.id)}
                          className="flex items-center justify-between p-2 bg-[#f7f8fa] border border-[#dfe3ea] rounded-md text-xs cursor-grab hover:border-[#0c66e4]"
                        >
                          <div>
                            <span className="font-semibold text-[#17202a]">{member.fullName}</span>
                            <span className="text-[10px] text-gray-400 ml-2">ID: {member.studentIdNo || "-"}</span>
                          </div>
                          
                          <div className="flex gap-1 text-[8px] font-semibold flex-wrap justify-end max-w-[120px]">
                            {selectedSkills.map((skill) => {
                              const hasSkill = member.skills.some(s => s.name.toLowerCase() === skill.toLowerCase());
                              if (!hasSkill) return null;
                              return (
                                <span key={skill} className="text-indigo-600 bg-indigo-50 px-1 rounded">
                                  {skill.slice(0, 3)}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Team Capability Balance Meter */}
                {team.members.length > 0 && (
                  <div className="border-t border-[#edf0f5] pt-4 space-y-2 text-[10px] font-semibold text-muted-foreground">
                    {Object.entries(stats).map(([skill, percentage]) => (
                      <div key={skill} className="flex items-center justify-between gap-2">
                        <span className="w-16 truncate">{skill}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[#edf0f5] overflow-hidden">
                          <div className="h-full bg-[#0c66e4]" style={{ width: `${percentage}%` }} />
                        </div>
                        <span className="w-8 text-right">{percentage}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
