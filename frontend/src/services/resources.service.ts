import { api } from "./api";

export interface LearningResource {
  id: string;
  title: string;
  url: string;
  type: string;
  provider: string | null;
  durationHours: number | null;
  isUniversityApproved: boolean;
  courseCode: string | null;
  rating: number | null;
  skills?: Array<{
    skill: {
      name: string;
    };
  }>;
}

export async function getResourcesForSkill(skillName: string): Promise<LearningResource[]> {
  const response = await api.get("/resources", { params: { skill: skillName } });
  return response.data.data;
}

export async function getResourcesForPath(pathId: string): Promise<LearningResource[]> {
  const response = await api.get(`/resources/path/${pathId}`);
  return response.data.data;
}

export async function completeResource(resourceId: string, completed: boolean): Promise<void> {
  await api.post("/resources/complete", { resourceId, completed });
}

export async function getCompletedResources(studentId: string): Promise<LearningResource[]> {
  const response = await api.get(`/resources/completed/${studentId}`);
  return response.data.data;
}
