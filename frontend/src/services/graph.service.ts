import { api } from "./api";

export interface GalaxyNode {
  id: string;
  name?: string;
  fullName?: string;
  handle?: string;
  language?: string;
  description?: string;
  labels?: string[];
  category?: string;
  confidence?: number;
  proficiency?: number;
  endorsementCount?: number;
  dormant?: boolean;
  endorsed?: boolean;
  sourceRepos?: string[];
  updatedAt?: string;
}

export interface GalaxyLink {
  source: string | { id: string };
  target: string | { id: string };
  type?: string;
  confidence?: number;
  sourceRepos?: string[];
  updatedAt?: string;
}

export interface GalaxyData {
  nodes: GalaxyNode[];
  links: GalaxyLink[];
}

export async function getStudentSkills(studentId: string) {
  const response = await api.get(`/graph/student/${studentId}/skills`);
  return response.data.data;
}

export async function getStudentsSkillsBulk(studentIds: string[]) {
  const response = await api.post("/graph/students/skills", { studentIds });
  return response.data.data;
}


export async function getStudentGalaxy(studentId: string) {
  const response = await api.get(`/graph/galaxy/${studentId}`);
  return response.data.data as GalaxyData;
}

export async function getPublicGalaxy(handle: string) {
  const response = await api.get(`/public/galaxy/${handle}`);
  return response.data.data as GalaxyData;
}

export async function triggerIngestion() {
  const response = await api.post("/ingestion/trigger");
  return response.data.data as {
    status: "queued" | "processing" | "completed" | "failed" | "rate_limited" | "not_started";
    stream?: string;
    jobId?: string;
    repositoryCount?: number;
    skillsFound?: number;
    manualIngestionAvailableAt?: string;
    message?: string;
  };
}

export async function getIngestionStatus(userId: string) {
  const response = await api.get(`/ingestion/status/${userId}`);
  return response.data.data as {
    userId: string;
    status: "queued" | "processing" | "completed" | "failed" | "rate_limited" | "not_started";
    jobId?: string;
    queuedAt?: string;
    startedAt?: string;
    completedAt?: string;
    repositoryCount?: number;
    skillsFound?: number;
    manualIngestionAvailableAt?: string;
    error?: string;
    message?: string;
  };
}
