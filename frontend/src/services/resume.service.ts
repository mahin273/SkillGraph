import { api } from "./api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

export function getResumePreviewUrl(roleId?: string): string {
  const url = new URL(`${BASE_URL}/resume/preview/me`);
  if (roleId) {
    url.searchParams.append("roleId", roleId);
  }
  return url.toString();
}

export async function getResumePreviewHtml(roleId?: string): Promise<string> {
  const response = await api.get<string>(
    `/resume/preview/me${roleId ? `?roleId=${roleId}` : ""}`
  );
  return response.data;
}

export async function downloadResumePdf(roleId?: string, fileName = "resume.pdf"): Promise<void> {
  const response = await api.post(
    "/resume/generate",
    { roleId },
    { responseType: "blob" }
  );

  const blob = new Blob([response.data], { type: "application/pdf" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function analyzeResume(text: string, roleId: string): Promise<{
  id: string;
  atsScore: number;
  matchedSkills: string[];
  gapSkills: string[];
  roleTitle: string;
}> {
  const response = await api.post("/resume/analyze", { text, roleId });
  return response.data.data;
}

export type ResumeDetails = {
  phoneNumber: string;
  relevantCoursework?: string;
  workExperiences: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
  }>;
  publications: Array<{
    title: string;
    publishedAt: string;
    url: string;
  }>;
};

export async function getResumeDetails(): Promise<ResumeDetails> {
  const response = await api.get<{ success: boolean; data: ResumeDetails }>("/resume/details");
  return response.data.data;
}

export async function saveResumeDetails(details: ResumeDetails): Promise<ResumeDetails> {
  const response = await api.post<{ success: boolean; data: ResumeDetails }>("/resume/details", details);
  return response.data.data;
}

