import { api } from "./api";

export interface AlumniProfile {
  id: string;
  graduationYear?: number | null;
  currentCompany?: string | null;
  currentRole?: string | null;
  yearsExperience?: number | null;
  linkedinUrl?: string | null;
  mentoringSkills: string[];
  name: string;
  email: string | null;
  githubHandle: string | null;
  matchingSkills: string[];
  existingMentorship?: {
    id: string;
    status: "requested" | "active" | "completed";
    milestones?: string[];
  } | null;
}

export interface MentorshipRequest {
  alumniId: string;
  skillName?: string;
  skillId?: string;
}

export interface MentorshipMessage {
  id: string;
  mentorshipId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    role: string;
  };
}

export async function getRecommendedMentors(targetRoleId?: string): Promise<AlumniProfile[]> {
  const response = await api.get("/mentors/recommended", {
    params: targetRoleId ? { targetRoleId } : {}
  });
  return response.data.data;
}

export async function requestMentorship(data: MentorshipRequest): Promise<any> {
  const response = await api.post("/mentors/request", data);
  return response.data.data;
}

export async function acceptMentorshipRequest(mentorshipId: string): Promise<any> {
  const response = await api.put(`/mentors/request/${mentorshipId}/accept`);
  return response.data.data;
}

export async function registerAsAlumni(data: {
  graduationYear?: number;
  currentCompany?: string;
  currentRole?: string;
  yearsExperience?: number;
  mentoringSkills: string[];
  willingToMentor: boolean;
  linkedinUrl?: string;
  alumniCardUrl?: string;
}): Promise<any> {
  const response = await api.post("/mentors/register", data);
  return response.data.data;
}

// Helper to check if current user has an alumni profile already
export async function getMyAlumniProfile(): Promise<any> {
  const response = await api.get("/mentors/profile");
  return response.data.data;
}

// Admin pending alumni list
export async function getPendingAlumni(): Promise<any[]> {
  const response = await api.get("/admin/alumni/pending");
  return response.data.data;
}

// Admin verify alumnus status (approve/reject)
export async function verifyAlumni(id: string, approve: boolean): Promise<any> {
  const response = await api.post(`/admin/alumni/${id}/verify`, { approve });
  return response.data.data;
}

export async function completeMentorshipRequest(mentorshipId: string): Promise<any> {
  const response = await api.put(`/mentors/request/${mentorshipId}/complete`);
  return response.data.data;
}

export async function declineMentorshipRequest(mentorshipId: string): Promise<any> {
  const response = await api.delete(`/mentors/request/${mentorshipId}`);
  return response.data.data;
}

export async function updateMentorshipMilestones(mentorshipId: string, milestones: string[]): Promise<any> {
  const response = await api.put(`/mentors/request/${mentorshipId}/milestones`, { milestones });
  return response.data.data;
}

export async function verifyMentorshipRequest(mentorshipId: string): Promise<any> {
  const response = await api.post(`/mentors/request/${mentorshipId}/verify`);
  return response.data.data;
}

export async function getMentorshipMessages(mentorshipId: string): Promise<MentorshipMessage[]> {
  const response = await api.get(`/mentors/request/${mentorshipId}/messages`);
  return response.data.data;
}

export async function sendMentorshipMessage(mentorshipId: string, body: string): Promise<MentorshipMessage> {
  const response = await api.post(`/mentors/request/${mentorshipId}/messages`, { body });
  return response.data.data;
}

export async function getMentorshipConnections(): Promise<any[]> {
  const response = await api.get("/mentors/connections");
  return response.data.data;
}

