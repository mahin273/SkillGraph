import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";

// Save Capstone Team assignments in the database
export async function saveTeamAssignments(req: Request, res: Response) {
  const userRole = req.user?.role as string | undefined;
  if (!req.user || (userRole !== "admin" && userRole !== "professor" && userRole !== "superadmin")) {
    fail(res, "FORBIDDEN", "Only admin or professor can manage assignments", 403);
    return;
  }

  const { teams } = req.body as {
    teams: Array<{
      id?: string;
      name: string;
      maxMembers: number;
      targetSkills?: string[];
      memberUserIds: string[];
    }>;
  };

  if (!Array.isArray(teams)) {
    fail(res, "INVALID_BODY", "teams array is required", 400);
    return;
  }

  const professorId = req.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Find and clean up previous capstone projects, requests and matches created by this professor
      const existingRequests = await tx.teamRequest.findMany({
        where: { requesterId: professorId },
        select: { id: true, projectId: true }
      });

      const requestIds = existingRequests.map((r) => r.id);
      const projectIds = existingRequests.map((r) => r.projectId);

      // Delete matches first
      if (requestIds.length > 0) {
        await tx.teamMatch.deleteMany({
          where: { requestId: { in: requestIds } }
        });
      }

      // Delete requests
      if (requestIds.length > 0) {
        await tx.teamRequest.deleteMany({
          where: { id: { in: requestIds } }
        });
      }

      // Delete projects (this cascades to project_collaborators)
      if (projectIds.length > 0) {
        await tx.academicProject.deleteMany({
          where: { id: { in: projectIds } }
        });
      }

      // 2. Create new projects, requests, and matches for each team
      for (let i = 0; i < teams.length; i++) {
        const team = teams[i];
        
        // Create AcademicProject representing the team
        const project = await tx.academicProject.create({
          data: {
            title: team.name,
            description: `Capstone project team balanced dynamically with size limit ${team.maxMembers}.`,
            isCapstone: true,
            ownerId: professorId,
            collaborators: {
              create: team.memberUserIds.map((userId) => ({
                userId,
                role: "Developer"
              }))
            }
          }
        });

        // Create TeamRequest representing the team parameters
        const request = await tx.teamRequest.create({
          data: {
            projectId: project.id,
            requesterId: professorId,
            requiredSkills: { limit: team.maxMembers, targetSkills: team.targetSkills || [] }
          }
        });

        // Create TeamMatch records for each member
        if (team.memberUserIds.length > 0) {
          await tx.teamMatch.createMany({
            data: team.memberUserIds.map((userId) => ({
              requestId: request.id,
              matchedUser: userId,
              matchScore: 100.0 // Balanced team match
            }))
          });
        }
      }
    });

    ok(res, { message: "Capstone team assignments saved successfully" });
  } catch (error: any) {
    console.error("Failed to save team assignments:", error);
    fail(res, "DB_ERROR", error.message || "Failed to persist assignments", 500);
  }
}

// Load Capstone Team assignments from the database
export async function loadTeamAssignments(req: Request, res: Response) {
  const userRole = req.user?.role as string | undefined;
  if (!req.user || (userRole !== "admin" && userRole !== "professor" && userRole !== "superadmin")) {
    fail(res, "FORBIDDEN", "Only admin or professor can load assignments", 403);
    return;
  }

  const professorId = req.user.id;

  try {
    const requests = await prisma.teamRequest.findMany({
      where: { requesterId: professorId },
      include: {
        project: {
          include: {
            collaborators: {
              include: {
                user: {
                  include: {
                    studentProfile: true
                  }
                }
              }
            }
          }
        },
        matches: {
          include: {
            user: {
              include: {
                studentProfile: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    // Format matches back into frontend structure
    const formattedTeams = requests.map((reqItem) => {
      // Retrieve the limit and targetSkills from requiredSkills JSON
      const skillsObj = reqItem.requiredSkills as Record<string, any> | null;
      const maxMembers = skillsObj?.limit !== undefined ? skillsObj.limit : 4;
      const targetSkills = Array.isArray(skillsObj?.targetSkills) ? skillsObj.targetSkills : [];

      // Map member user details
      const members = reqItem.matches.map((match) => ({
        id: match.user.id,
        fullName: match.user.fullName,
        email: match.user.email || "",
        studentIdNo: match.user.studentProfile?.studentIdNo || undefined,
        // Frontend will lazy fetch skills or we leave it empty to trigger refresh
        skills: [],
        scores: {}
      }));

      return {
        id: reqItem.project.id,
        name: reqItem.project.title,
        maxMembers,
        targetSkills,
        members
      };
    });

    ok(res, formattedTeams);
  } catch (error: any) {
    console.error("Failed to load team assignments:", error);
    fail(res, "DB_ERROR", error.message || "Failed to retrieve assignments", 500);
  }
}