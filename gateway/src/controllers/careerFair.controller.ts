import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";
import { env } from "../config/env.js";

// Retrieve upcoming career fairs for the student's university (or all fairs if not a student)
export async function getUpcomingFairs(req: Request, res: Response) {
  try {
    let universityId: string | undefined;

    if (req.user) {
      const student = await prisma.studentProfile.findUnique({
        where: { userId: req.user.id }
      });
      if (student) {
        universityId = student.universityId || undefined;
      }
    }

    const fairs = await prisma.careerFair.findMany({
      where: universityId ? { universityId } : {},
      include: {
        university: true,
        _count: {
          select: { booths: true }
        }
      },
      orderBy: { eventDate: "asc" }
    });

    ok(res, fairs);
  } catch (error) {
    console.error("Failed to get upcoming career fairs:", error);
    fail(res, "INTERNAL_ERROR", "Failed to retrieve career fairs", 500);
  }
}

// Compare student profile to fair company requirements and return match rates & gaps
export async function getFairMatches(req: Request, res: Response) {
  const { fairId } = req.params;
  let { studentId } = req.params;

  try {
    let resolvedUserId: string;

    if (studentId === "me") {
      if (!req.user) {
        fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
        return;
      }
      resolvedUserId = req.user.id;
    } else {
      const student = await prisma.studentProfile.findFirst({
        where: { OR: [{ id: studentId }, { userId: studentId }] }
      });
      if (!student) {
        fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
        return;
      }
      resolvedUserId = student.userId;
    }

    // Fetch student profile details (optional for non-students)
    const student = await prisma.studentProfile.findUnique({
      where: { userId: resolvedUserId }
    });

    // Get student's skills from graph-service (only if student profile exists)
    let skills: any[] = [];
    if (student) {
      try {
        const response = await fetch(`${env.GRAPH_SERVICE_URL}/graph/student/${resolvedUserId}/skills`);
        if (response.ok) {
          const body = await response.json();
          skills = body?.data?.skills || [];
        }
      } catch (err) {
        console.error("Failed to fetch student skills from graph-service:", err);
      }
    }

    // Get all booths for this fair
    const booths = await prisma.careerFairBooth.findMany({
      where: { fairId }
    });

    const matches = booths.map((booth) => {
      const requiredSkillsList = (booth.requiredSkills as any[]) || [];
      let totalCriticality = 0;
      let matchedCriticality = 0;
      const matchedSkills: string[] = [];
      const gapSkills: string[] = [];

      for (const reqSkill of requiredSkillsList) {
        let reqName = "";
        let criticality = 1;
        let skillLabel = "";

        if (typeof reqSkill === "string") {
          reqName = reqSkill.toLowerCase();
          criticality = 1;
          skillLabel = reqSkill;
        } else if (reqSkill && typeof reqSkill === "object") {
          reqName = (reqSkill.name || "").toLowerCase();
          criticality = reqSkill.criticality || 1;
          skillLabel = reqSkill.name || "";
        }

        if (!reqName) continue;
        totalCriticality += criticality;

        const hasSkill = skills.some(
          (s) => s.name.toLowerCase() === reqName && s.confidence >= 0.5 && !s.dormant
        );

        if (hasSkill) {
          matchedCriticality += criticality;
          matchedSkills.push(skillLabel);
        } else {
          gapSkills.push(skillLabel);
        }
      }

      const matchPercentage = totalCriticality > 0 ? Math.round((matchedCriticality / totalCriticality) * 100) : 100;
      
      let matchTier: "Strong" | "Partial" | "Weak" = "Weak";
      if (matchPercentage >= 70) {
        matchTier = "Strong";
      } else if (matchPercentage >= 40) {
        matchTier = "Partial";
      }

      return {
        id: booth.id,
        companyName: booth.companyName,
        boothNumber: booth.boothNumber,
        hiringRoles: booth.hiringRoles,
        requiredSkills: requiredSkillsList,
        matchedSkills,
        gapSkills,
        matchPercentage,
        matchTier
      };
    });

    // Sort matches descending by percentage
    matches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    ok(res, {
      fairId,
      studentId: student?.id || null,
      matches
    });
  } catch (error) {
    console.error("Failed to fetch career fair matches:", error);
    fail(res, "INTERNAL_ERROR", "Failed to calculate matches", 500);
  }
}

// Admin-only creation endpoint for uploading career fairs and booths
export async function createCareerFair(req: Request, res: Response) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "professor" && req.user.role !== "superadmin")) {
    fail(res, "FORBIDDEN", "Only admin or professor can create career fairs", 403);
    return;
  }

  const { name, eventDate, location, universityId, booths } = req.body as {
    name: string;
    eventDate: string;
    location?: string;
    universityId: string;
    booths?: Array<{
      companyName: string;
      boothNumber?: string;
      hiringRoles?: string[];
      requiredSkills: Array<{ name: string; criticality: number }>;
    }>;
  };

  if (!name || !eventDate || !universityId) {
    fail(res, "INVALID_BODY", "name, eventDate, and universityId are required fields", 400);
    return;
  }

  try {
    const newFair = await prisma.careerFair.create({
      data: {
        name,
        eventDate: new Date(eventDate),
        location: location || null,
        universityId,
        booths: booths && booths.length > 0 ? {
          create: booths.map((b) => ({
            companyName: b.companyName,
            boothNumber: b.boothNumber || null,
            hiringRoles: b.hiringRoles || [],
            requiredSkills: b.requiredSkills
          }))
        } : undefined
      },
      include: {
        booths: true
      }
    });

    ok(res, newFair, 201);
  } catch (error) {
    console.error("Failed to create career fair:", error);
    fail(res, "INTERNAL_ERROR", "Failed to create career fair", 500);
  }
}