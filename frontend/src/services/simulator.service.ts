import { api } from "./api";

export interface SimulatedResult {
  studentId: string;
  targetRole: {
    id: string;
    name: string;
    description?: string | null;
  };
  original: {
    completionPercentage: number;
    estimatedWeeks: number;
    skillsCompleted: number;
    skillsRemaining: number;
  };
  simulated: {
    completionPercentage: number;
    estimatedWeeks: number;
    skillsCompleted: number;
    skillsRemaining: number;
    completionDelta: number;
    weeksSaved: number;
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
        url: string;
        type: string;
        provider: string | null;
        durationHours: number | null;
        isUniversityApproved: boolean;
        courseCode: string | null;
        rating: number | null;
      }>;
    }>;
  };
}

export interface SavedScenario {
  id: string;
  studentId: string;
  scenarioName: string;
  targetRoleId: string;
  hypotheticalSkills: string[];
  simulatedResult: SimulatedResult["simulated"];
  completionDelta: number;
  weeksSaved: number;
  createdAt: string;
  targetRole?: {
    id: string;
    title: string;
  } | null;
}

export async function runSimulation(
  studentId: string,
  targetRoleId: string,
  hypotheticalSkills: string[]
): Promise<SimulatedResult> {
  const response = await api.post("/simulator/run", {
    studentId,
    targetRoleId,
    hypotheticalSkills
  });
  return response.data.data;
}

export async function saveSimulation(data: {
  scenarioName: string;
  targetRoleId: string;
  hypotheticalSkills: string[];
  simulatedResult: SimulatedResult["simulated"];
  completionDelta: number;
  weeksSaved: number;
}): Promise<SavedScenario> {
  const response = await api.post("/simulator/save", data);
  return response.data.data;
}

export async function getSimulations(studentId: string): Promise<SavedScenario[]> {
  const response = await api.get(`/simulator/${studentId}`);
  return response.data.data;
}

export async function deleteSimulation(id: string): Promise<void> {
  await api.delete(`/simulator/${id}`);
}
