import { api } from "./api";

export type DecayedSkill = {
  id: string;
  studentId: string;
  skillName: string;
  currentWeight: number;
  lastActiveDate: string;
  lastDecayedAt: string;
  isDormant: boolean;
  decayCycles: number;
};

export async function getDecayedSkills(studentId: string = "me"): Promise<DecayedSkill[]> {
  const response = await api.get(`/skills/decayed/${studentId}`);
  return response.data.data;
}

export async function reactivateSkill(skillName: string): Promise<{ success: boolean }> {
  const response = await api.post("/skills/reactivate", { skillName });
  return response.data;
}
