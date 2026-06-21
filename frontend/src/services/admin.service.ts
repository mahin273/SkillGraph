import { api } from "./api";

export interface SkillHeatmapItem {
  name: string;
  category: string;
  count: number;
}

export interface IndustryGapItem {
  roleTitle: string;
  roleId: string;
  skillName: string;
  industryRequired: number;
  studentAverage: number;
}

export interface MissingSkillItem {
  name: string;
  count: number;
}

export interface SkillTrendItem {
  name: string;
  category: string;
  date: string;
  count: number;
}

export interface RoleRequirement {
  id: string;
  name: string;
  category: string;
  criticality: number;
}

export interface IndustryRole {
  id: string;
  title: string;
  description?: string;
  source?: string;
  createdAt: string;
  requiredSkills: RoleRequirement[];
}

export interface CreateRoleDto {
  title: string;
  description?: string;
  requirements: Array<{ skillId: string; criticality: number }>;
}

export async function getSkillHeatmap(): Promise<SkillHeatmapItem[]> {
  const response = await api.get("/admin/analytics/skill-heatmap");
  return response.data.data;
}

export async function getIndustryGap(): Promise<IndustryGapItem[]> {
  const response = await api.get("/admin/analytics/industry-gap");
  return response.data.data;
}

export async function getMissingSkills(): Promise<MissingSkillItem[]> {
  const response = await api.get("/admin/analytics/missing-skills");
  return response.data.data;
}

export async function getSkillTrends(): Promise<SkillTrendItem[]> {
  const response = await api.get("/admin/analytics/trend");
  return response.data.data;
}

export async function listRoles(): Promise<IndustryRole[]> {
  const response = await api.get("/admin/roles");
  return response.data.data;
}

export async function createRole(data: CreateRoleDto): Promise<any> {
  const response = await api.post("/admin/roles", data);
  return response.data.data;
}

export async function updateRole(id: string, data: CreateRoleDto): Promise<any> {
  const response = await api.put(`/admin/roles/${id}`, data);
  return response.data.data;
}

export async function deleteRole(id: string): Promise<any> {
  const response = await api.delete(`/admin/roles/${id}`);
  return response.data.data;
}

export async function getAllSkills(): Promise<Array<{ id: string; name: string; category?: string }>> {
  const response = await api.get("/admin/skills");
  return response.data.data;
}

export async function listUsers(page = 1, limit = 20, isVerified?: boolean): Promise<{ users: any[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const params: any = { page, limit };
  if (isVerified !== undefined) {
    params.isVerified = isVerified;
  }
  const response = await api.get("/admin/users", { params });
  return response.data.data;
}


export async function updateUser(id: string, data: { role?: string; isActive?: boolean; isVerified?: boolean }): Promise<any> {
  const response = await api.patch(`/admin/users/${id}`, data);
  return response.data.data;
}

export async function createInvitation(data: { email: string; role: string; universityId?: string }): Promise<any> {
  const response = await api.post("/admin/invitations", data);
  return response.data.data;
}

export async function listAuditLogs(): Promise<any[]> {
  const response = await api.get("/admin/audit-logs");
  return response.data.data;
}

export async function getConfig(): Promise<any> {
  const response = await api.get("/admin/config");
  return response.data.data;
}

export async function updateConfig(data: {
  skillDecayRate?: number;
  scanCooldownHours?: number;
  sessionDurationSeconds?: number;
  isMaintenanceMode?: boolean;
  isIngestionDisabled?: boolean;
  isNlpThrottled?: boolean;
}): Promise<any> {
  const response = await api.post("/admin/config", data);
  return response.data.data;
}

export interface IngestionJob {
  userId: string;
  status: string;
  jobId?: string;
  queuedAt?: string;
  startedAt?: string;
  completedAt?: string;
  repositoryCount?: number;
  skillsFound?: number;
  error?: string;
}

export interface GithubConnection {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  provider: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface GithubRateLimit {
  remaining: number;
  limit: number;
  resetAt: string;
  resetMins: number;
}

export interface SkillCategory {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function getIngestionJobs(): Promise<IngestionJob[]> {
  const response = await api.get("/admin/jobs");
  return response.data.data;
}

export async function getGithubConnections(): Promise<{ connections: GithubConnection[]; rateLimit: GithubRateLimit | null }> {
  const response = await api.get("/admin/github-connections");
  const data = response.data.data;

  if (Array.isArray(data)) {
    return { connections: data, rateLimit: null };
  }

  return {
    connections: data.connections ?? [],
    rateLimit: data.rateLimit ?? null
  };
}

export async function getCategories(): Promise<SkillCategory[]> {
  const response = await api.get("/admin/categories");
  return response.data.data;
}

export async function createCategory(name: string): Promise<SkillCategory> {
  const response = await api.post("/admin/categories", { name });
  return response.data.data;
}

export async function createSkill(data: { name: string; categoryId?: string; aliases?: string[] }): Promise<any> {
  const response = await api.post("/admin/skills", data);
  return response.data.data;
}

export async function updateSkill(id: string, data: { name?: string; categoryId?: string | null; aliases?: string[] }): Promise<any> {
  const response = await api.put(`/admin/skills/${id}`, data);
  return response.data.data;
}

export async function deleteSkill(id: string): Promise<any> {
  const response = await api.delete(`/admin/skills/${id}`);
  return response.data.data;
}

export async function downloadAuditLogsCsv(filters?: { action?: string; entity?: string; search?: string }): Promise<Blob> {
  const response = await api.get("/admin/audit-logs/export", {
    params: filters,
    responseType: "blob"
  });
  return response.data;
}

export async function listStudents(): Promise<any[]> {
  const response = await api.get("/professor/students");
  return response.data.data;
}

export async function listCourses(): Promise<any[]> {
  const response = await api.get("/professor/courses");
  return response.data.data;
}

export async function mapCourse(data: { title: string; url: string; courseCode: string; skills: string[] }): Promise<any> {
  const response = await api.post("/professor/courses", data);
  return response.data.data;
}

export async function listCapstoneMatches(): Promise<any[]> {
  const response = await api.get("/professor/capstone-matches");
  return response.data.data;
}

export interface KpiStats {
  totalUsers: number;
  githubConnections: number;
  connectionRate: number;
  totalRoles: number;
  pendingAlumni: number;
}

export async function getKpiStats(): Promise<KpiStats> {
  const response = await api.get("/admin/kpi-stats");
  return response.data.data;
}

export async function extractSyllabusSkills(text: string): Promise<Array<{ skill_name: string; confidence: number }>> {
  const response = await api.post("/professor/courses/extract-skills", { text });
  return response.data.data;
}

export async function listAlumni(): Promise<any[]> {
  const response = await api.get("/professor/alumni");
  return response.data.data;
}

export interface University {
  id: string;
  name: string;
  shortName: string;
  country: string;
  allowedDomains: string[];
  _count?: {
    users: number;
    studentProfiles: number;
    alumniProfiles: number;
  };
}

export async function listUniversities(): Promise<University[]> {
  const response = await api.get("/admin/universities");
  return response.data.data.universities;
}

export async function createUniversity(data: { name: string; shortName: string; country?: string; allowedDomains?: string[] }): Promise<any> {
  const response = await api.post("/admin/universities", data);
  return response.data.data.university;
}

export async function updateUniversity(id: string, data: { name?: string; shortName?: string; country?: string; allowedDomains?: string[] }): Promise<any> {
  const response = await api.put(`/admin/universities/${id}`, data);
  return response.data.data.university;
}

export interface HealthStatus {
  services: {
    gateway: string;
    postgres: string;
    redis: string;
    graphService: string;
    nlpService: string;
    notificationService: string;
  };
  metrics: {
    databaseSize: string;
  };
}

export async function getSystemHealth(): Promise<HealthStatus> {
  const response = await api.get("/admin/health");
  return response.data.data;
}

export interface ThreatStats {
  threatMetrics: {
    loginSuccess: number;
    loginFailed: number;
    configUpdates: number;
    activeThreatLevel: string;
  };
  recentFailures: Array<{
    id: string;
    email: string;
    fullName: string;
    ipAddress: string;
    createdAt: string;
  }>;
}

export async function getSecurityThreats(): Promise<ThreatStats> {
  const response = await api.get("/admin/security/threats");
  return response.data.data;
}
export async function saveTeamAssignments(teams: Array<{ name: string; maxMembers: number; memberUserIds: string[] }>): Promise<any> {
  const response = await api.post("/admin/team-requests/save", { teams });
  return response.data.data;
}

export async function loadTeamAssignments(): Promise<any[]> {
  const response = await api.get("/admin/team-requests/load");
  return response.data.data;
}
