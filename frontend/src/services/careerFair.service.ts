import { api } from "./api";

export interface CareerFair {
  id: string;
  universityId: string;
  name: string;
  eventDate: string;
  location?: string | null;
  createdAt: string;
  university?: {
    id: string;
    name: string;
  };
  _count?: {
    booths: number;
  };
}

export interface CareerFairMatch {
  id: string;
  companyName: string;
  boothNumber?: string | null;
  hiringRoles: string[];
  requiredSkills: Array<{ name: string; criticality: number }>;
  matchedSkills: string[];
  gapSkills: string[];
  matchPercentage: number;
  matchTier: "Strong" | "Partial" | "Weak";
}

export interface CareerFairMatchesResponse {
  fairId: string;
  studentId: string;
  matches: CareerFairMatch[];
}

export async function getUpcomingCareerFairs(): Promise<CareerFair[]> {
  const response = await api.get("/career-fair/upcoming");
  return response.data.data;
}

export async function getCareerFairMatches(fairId: string): Promise<CareerFairMatchesResponse> {
  const response = await api.get(`/career-fair/${fairId}/matches/me`);
  return response.data.data;
}

export interface TalentSearchResult {
  studentId: string;
  userId: string;
  fullName: string;
  publicHandle: string;
  matchPercentage: number;
  matchedSkills: string[];
  gapSkills: string[];
  skills: Array<{ name: string; confidence: number; dormant: boolean }>;
}

export interface CareerFairBooth {
  id: string;
  fairId: string;
  companyName: string;
  boothNumber?: string | null;
  hiringRoles: string[];
  requiredSkills: Array<{ name: string; criticality: number }>;
}

export async function getFairBooths(fairId: string): Promise<CareerFairBooth[]> {
  const response = await api.get(`/career-fair/${fairId}/booths`);
  return response.data.data;
}

export async function searchTalents(fairId: string, boothId?: string): Promise<TalentSearchResult[]> {
  const response = await api.get(`/admin/career-fairs/${fairId}/search-talents`, {
    params: { boothId }
  });
  return response.data.data;
}

export async function sendInterviewInvite(data: {
  studentId: string;
  boothId: string;
  fairId: string;
  message?: string;
}): Promise<any> {
  const response = await api.post("/admin/career-fairs/invite", data);
  return response.data.data;
}
