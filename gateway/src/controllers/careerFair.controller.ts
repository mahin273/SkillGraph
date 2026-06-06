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

export async function getFairBooths(req: Request, res: Response) {
  const { fairId } = req.params;
  try {
    const booths = await prisma.careerFairBooth.findMany({
      where: { fairId },
      orderBy: { companyName: "asc" }
    });
    ok(res, booths);
  } catch (error) {
    console.error("Failed to get fair booths:", error);
    fail(res, "INTERNAL_ERROR", "Failed to retrieve booths", 500);
  }
}

export async function searchTalents(req: Request, res: Response) {
  const { fairId } = req.params;
  const { boothId } = req.query as { boothId?: string };

  if (!fairId) {
    fail(res, "INVALID_QUERY", "fairId is required", 400);
    return;
  }

  try {
    const fair = await prisma.careerFair.findUnique({
      where: { id: fairId }
    });

    if (!fair) {
      fail(res, "FAIR_NOT_FOUND", "Career fair not found", 404);
      return;
    }

    let searchSkills: Array<{ name: string; criticality: number }> = [];

    if (boothId) {
      const booth = await prisma.careerFairBooth.findUnique({
        where: { id: boothId }
      });
      if (booth) {
        const requiredSkillsList = (booth.requiredSkills as any[]) || [];
        searchSkills = requiredSkillsList.map((reqSkill) => {
          if (typeof reqSkill === "string") {
            return { name: reqSkill, criticality: 1 };
          } else if (reqSkill && typeof reqSkill === "object") {
            return { name: reqSkill.name || "", criticality: reqSkill.criticality || 1 };
          }
          return { name: "", criticality: 1 };
        }).filter((s) => s.name);
      }
    }

    // Fetch all students of this university
    const students = await prisma.studentProfile.findMany({
      where: { universityId: fair.universityId },
      include: { user: true }
    });

    const results = [];

    for (const student of students) {
      let studentSkills: any[] = [];
      try {
        const response = await fetch(`${env.GRAPH_SERVICE_URL}/graph/student/${student.userId}/skills`);
        if (response.ok) {
          const body = await response.json();
          studentSkills = body?.data?.skills || [];
        }
      } catch (err) {
        console.error(`Failed to fetch student ${student.userId} skills:`, err);
      }

      let totalCriticality = 0;
      let matchedCriticality = 0;
      const matchedSkills: string[] = [];
      const gapSkills: string[] = [];

      for (const reqSkill of searchSkills) {
        const reqName = reqSkill.name.toLowerCase();
        const criticality = reqSkill.criticality;

        totalCriticality += criticality;

        const hasSkill = studentSkills.some(
          (s) => s.name.toLowerCase() === reqName && s.confidence >= 0.5 && !s.dormant
        );

        if (hasSkill) {
          matchedCriticality += criticality;
          matchedSkills.push(reqSkill.name);
        } else {
          gapSkills.push(reqSkill.name);
        }
      }

      const matchPercentage = totalCriticality > 0 ? Math.round((matchedCriticality / totalCriticality) * 100) : 100;

      results.push({
        studentId: student.id,
        userId: student.userId,
        fullName: student.user.fullName,
        publicHandle: student.publicHandle,
        matchPercentage,
        matchedSkills,
        gapSkills,
        skills: studentSkills.map(s => ({ name: s.name, confidence: s.confidence, dormant: s.dormant }))
      });
    }

    // Sort by match percentage descending
    results.sort((a, b) => b.matchPercentage - a.matchPercentage);

    ok(res, results);
  } catch (error: any) {
    console.error("Failed to search talents:", error);
    fail(res, "INTERNAL_ERROR", error.message || "Failed to search talents", 500);
  }
}

export async function sendInterviewInvite(req: Request, res: Response) {
  const { studentId, boothId, fairId, message } = req.body as {
    studentId: string;
    boothId: string;
    fairId: string;
    message?: string;
  };

  if (!studentId || !boothId || !fairId) {
    fail(res, "INVALID_BODY", "studentId, boothId, and fairId are required fields", 400);
    return;
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { user: true }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    const booth = await prisma.careerFairBooth.findUnique({
      where: { id: boothId }
    });

    if (!booth) {
      fail(res, "BOOTH_NOT_FOUND", "Booth not found", 404);
      return;
    }

    const fair = await prisma.careerFair.findUnique({
      where: { id: fairId }
    });

    if (!fair) {
      fail(res, "FAIR_NOT_FOUND", "Career fair not found", 404);
      return;
    }

    // Create the system notification for the student user
    const inviteNotification = await prisma.systemNotification.create({
      data: {
        userId: student.userId,
        type: "CAREER_FAIR_INVITE",
        payload: {
          fairId: fair.id,
          fairName: fair.name,
          boothId: booth.id,
          companyName: booth.companyName,
          boothNumber: booth.boothNumber || "",
          message: message || `We noticed your strong matching skills and want to invite you to discuss hiring roles at our booth!`
        }
      }
    });

    ok(res, inviteNotification, 201);
  } catch (error: any) {
    console.error("Failed to send interview invitation:", error);
    fail(res, "INTERNAL_ERROR", error.message || "Failed to send interview invitation", 500);
  }
}
