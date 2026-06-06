import { api } from "./api";

export interface CareerGPSData {
  studentId: string;
  targetRole: {
    id: string;
    name: string;
    description?: string | null;
  };
  completionPercentage: number;
  completedSkills: Array<{
    id: string;
    name: string;
    category: string;
  }>;
  missingSkills: Array<{
    id: string;
    name: string;
    category: string;
    learningDifficulty: number;
  }>;
  roadmap: Array<{
    skillId: string;
    skillName: string;
    category: string;
    difficulty: number;
    prerequisites: string[];
    estimatedWeeks: number;
    criticality?: number;
    objective: string;
    practiceProject: string;
    milestones: string[];
    resources: Array<{
      id: string;
      title: string;
      type: string;
      url?: string;
    }>;
  }>;
  estimatedWeeks: number;
  totalSkillsRequired: number;
  skillsCompleted: number;
  skillsRemaining: number;
}

export interface CareerGPSHistoryItem {
  id: string;
  roleId: string;
  roleName: string;
  completionPercentage: number;
  estimatedWeeks: number;
  lastUpdated: string;
}

export async function getCareerGPS(studentId: string, targetRoleId: string): Promise<CareerGPSData> {
  const response = await api.get("/career-gps", { params: { studentId, targetRoleId } });
  return response.data.data;
}

export async function saveCareerGPS(data: {
  studentId: string;
  targetRoleId: string;
  completionPercentage: number;
  estimatedWeeks: number;
  missingSkills: CareerGPSData["missingSkills"];
  roadmap: CareerGPSData["roadmap"];
}): Promise<void> {
  await api.post("/career-gps/save", data);
}

export async function getCareerGPSHistory(studentId: string): Promise<CareerGPSHistoryItem[]> {
  const response = await api.get(`/career-gps/history/${studentId}`);
  return response.data.data.history;
}

export async function getRoles(): Promise<Array<{ id: string; name: string; description?: string | null; requiredSkills: Array<{ name: string; criticality: number }> }>> {
  const response = await api.get("/graph/roles");
  const roles = response.data.data.roles || [];
  return roles.map((role: any) => ({
    id: role.id,
    name: role.title,
    description: role.description,
    requiredSkills: role.requiredSkills ?? []
  }));
}
