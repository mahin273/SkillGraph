import { api } from "./api";

export type MatchScope = "same_department" | "same_university" | "all_universities";

export type MatchmakerCandidate = {
  studentId: string;
  name: string;
  avatarUrl?: string | null;
  publicHandle: string;
  university: string;
  department: string;
  graduationYear?: number | null;
  sameUniversity: boolean;
  sameDepartment: boolean;
  matchScore: number;
  matchedSkills: Array<{
    name: string;
    category: string;
    confidence: number;
    proficiency: number;
    endorsementCount: number;
    sourceRepos: string[];
  }>;
  missingSkills: string[];
  evidence: {
    avgConfidence: number;
    endorsementCount: number;
    repoSignalCount: number;
  };
  reasons: string[];
};

export type MatchmakerResult = {
  scope: MatchScope;
  requiredSkills: string[];
  candidates: MatchmakerCandidate[];
};

export async function findMatchmakerCandidates(data: {
  requiredSkills: string[];
  scope: MatchScope;
  limit?: number;
}): Promise<MatchmakerResult> {
  const response = await api.post("/matchmaker/candidates", data);
  return response.data.data;
}

export async function sendMatchInvite(data: {
  candidateId: string;
  projectName: string;
  requiredSkills: string[];
  message?: string;
}): Promise<void> {
  await api.post("/matchmaker/invite", data);
}

export async function getAllSkills(): Promise<Array<{ name: string; category: string }>> {
  const response = await api.get("/graph/skills/all");
  return response.data.data.skills;
}
