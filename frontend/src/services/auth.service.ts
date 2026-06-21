import { api } from "./api";

export type AcademicProfile = {
  universityId?: string | null;
  universityName?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  graduationYear?: number | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
};

export type AcademicOptions = {
  universities: Array<{
    id: string;
    name: string;
    shortName: string;
    country?: string | null;
    departments: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  }>;
};

export type UniversityOption = AcademicOptions["universities"][number];
export type DepartmentOption = UniversityOption["departments"][number];

export async function getCurrentUser() {
  const response = await api.get("/auth/me");
  return response.data.data;
}

export async function getAcademicOptions(): Promise<AcademicOptions> {
  const response = await api.get("/auth/academic-options");
  return response.data.data;
}

export async function createUniversity(input: {
  name: string;
  country?: string | null;
}): Promise<UniversityOption & { created: boolean }> {
  const response = await api.post("/auth/universities", input);
  return response.data.data;
}

export async function createDepartment(input: {
  universityId: string;
  name: string;
  code?: string | null;
}): Promise<DepartmentOption & { created: boolean }> {
  const response = await api.post("/auth/departments", input);
  return response.data.data;
}

export async function updateAcademicProfile(input: {
  universityId: string;
  departmentId?: string | null;
  graduationYear?: number | null;
  portfolioUrl?: string | null;
  linkedinUrl?: string | null;
}): Promise<AcademicProfile> {
  const response = await api.patch("/auth/academic-profile", input);
  return response.data.data;
}

export async function registerWithEmail(input: { fullName: string; email: string; password: string; role?: string; inviteToken?: string }) {
  const response = await api.post("/auth/register", input);
  return response.data.data;
}

export async function getInvitationDetails(token: string): Promise<any> {
  const response = await api.get(`/auth/invite/${token}`);
  return response.data.data;
}

export async function updateUserRole(role: string): Promise<{ role: string }> {
  const response = await api.patch("/auth/role", { role });
  return response.data.data;
}

export async function loginWithEmail(input: { email: string; password: string }) {
  const response = await api.post("/auth/login", input);
  return response.data.data;
}

export async function verifyEmail(token: string) {
  const response = await api.post("/auth/verify-email", { token });
  return response.data.data;
}

export async function logout() {
  await api.post("/auth/logout");
}
