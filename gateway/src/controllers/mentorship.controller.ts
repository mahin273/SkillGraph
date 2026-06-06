import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";
import { env } from "../config/env.js";
import { setAuthCookies } from "./auth.controller.js";

// Fetch recommended alumni mentors based on student's missing skills or weak skills
export async function getRecommendedMentors(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { targetRoleId } = req.query as { targetRoleId?: string };

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    // 1. Resolve student's target skills to learn (gaps)
    let targetSkillNames: string[] = [];

    let activeTargetRoleId = targetRoleId;
    if (!activeTargetRoleId) {
      // Fetch latest from GPS history
      try {
        const historyResponse = await fetch(`${env.GRAPH_SERVICE_URL}/graph/career-gps/history/${req.user.id}`);
        if (historyResponse.ok) {
          const body = await historyResponse.json();
          const history = body?.data?.history || [];
          if (history.length > 0) {
            activeTargetRoleId = history[0].roleId;
          }
        }
      } catch (err) {
        console.error("Failed to fetch career gps history:", err);
      }
    }

    if (activeTargetRoleId) {
      // Fetch Career GPS roadmap to get missing skills
      try {
        const gpsResponse = await fetch(
          `${env.GRAPH_SERVICE_URL}/graph/career-gps?studentId=${req.user.id}&targetRoleId=${activeTargetRoleId}`
        );
        if (gpsResponse.ok) {
          const body = await gpsResponse.json();
          const missingSkills = body?.data?.missingSkills || [];
          targetSkillNames = missingSkills.map((s: any) => s.name.toLowerCase());
        }
      } catch (err) {
        console.error("Failed to fetch career gps details:", err);
      }
    }

    // Fallback: If no target role or gaps resolved, find student's weak or dormant skills
    if (targetSkillNames.length === 0) {
      try {
        const skillsResponse = await fetch(`${env.GRAPH_SERVICE_URL}/graph/student/${req.user.id}/skills`);
        if (skillsResponse.ok) {
          const body = await skillsResponse.json();
          const skills = body?.data?.skills || [];
          const weakOrDormant = skills.filter((s: any) => s.dormant || s.confidence < 0.65);
          targetSkillNames = weakOrDormant.map((s: any) => s.name.toLowerCase());
        }
      } catch (err) {
        console.error("Failed to fetch student skills fallback:", err);
      }
    }

    // 2. Query all willing alumni profiles from PG
    const alumniProfiles = await prisma.alumniProfile.findMany({
      where: {
        willingToMentor: true,
        verified: true,
        // Don't recommend yourself if you are also registered as an alumnus
        userId: { not: req.user.id }
      },
      include: {
        user: true,
        mentorships: {
          where: { studentId: student.id },
          include: { skill: true }
        }
      }
    });

    // 3. Score and filter alumni based on mentoringSkills overlap with student target skills
    const recommendations = alumniProfiles
      .map((profile) => {
        const mentoringSkills = profile.mentoringSkills || [];
        const matchingSkills = mentoringSkills.filter((skillName) =>
          targetSkillNames.includes(skillName.toLowerCase())
        );

        // Fetch current active or requested mentorships with this mentor
        const existingMentorship = profile.mentorships[0] || null;

        return {
          id: profile.id,
          graduationYear: profile.graduationYear,
          currentCompany: profile.currentCompany,
          currentRole: profile.currentRole,
          yearsExperience: profile.yearsExperience,
          linkedinUrl: profile.linkedinUrl,
          mentoringSkills,
          matchingSkills,
          name: profile.user.fullName,
          email: profile.user.email,
          githubHandle: profile.user.githubHandle,
          existingMentorship
        };
      })
      // If student has gaps, prioritize mentors who can teach those gaps
      .sort((a, b) => b.matchingSkills.length - a.matchingSkills.length);

    ok(res, recommendations);
  } catch (error) {
    console.error("Failed to get recommended mentors:", error);
    fail(res, "INTERNAL_ERROR", "Failed to retrieve recommended mentors", 500);
  }
}

// Request a mentorship connection
export async function requestMentorship(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { alumniId, skillName, skillId } = req.body as {
    alumniId: string;
    skillName?: string;
    skillId?: string;
  };

  if (!alumniId || (!skillName && !skillId)) {
    fail(res, "INVALID_BODY", "alumniId and either skillName or skillId are required", 400);
    return;
  }

  try {
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
      include: { user: true }
    });

    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }

    // Resolve skillId if not provided
    let resolvedSkillId = skillId;
    if (!resolvedSkillId && skillName) {
      const skill = await prisma.skill.findFirst({
        where: { name: { equals: skillName, mode: "insensitive" } }
      });
      if (!skill) {
        fail(res, "SKILL_NOT_FOUND", `Skill with name ${skillName} not found`, 404);
        return;
      }
      resolvedSkillId = skill.id;
    }

    if (!resolvedSkillId) {
      fail(res, "SKILL_NOT_FOUND", "Could not resolve skill", 404);
      return;
    }

    // Check if a mentorship request already exists between this student and alumnus for this skill
    const existing = await prisma.alumniMentorship.findFirst({
      where: {
        studentId: student.id,
        alumniId,
        skillId: resolvedSkillId
      }
    });

    if (existing) {
      fail(res, "DUPLICATE_REQUEST", "A mentorship connection already exists for this skill", 409);
      return;
    }

    const mentorship = await prisma.alumniMentorship.create({
      data: {
        studentId: student.id,
        alumniId,
        skillId: resolvedSkillId,
        status: "requested"
      },
      include: {
        alumni: {
          include: { user: true }
        },
        skill: true
      }
    });

    // Optional: Send real-time notification to the alumnus
    try {
      const alumniUser = mentorship.alumni.user;
      await prisma.systemNotification.create({
        data: {
          userId: alumniUser.id,
          type: "MENTORSHIP_REQUESTED",
          payload: {
            studentName: student.user.fullName || student.user.githubHandle || "Student",
            studentId: student.id,
            skillName: mentorship.skill.name,
            mentorshipId: mentorship.id
          }
        }
      });
    } catch (notifErr) {
      console.error("Failed to create system notification for mentorship request:", notifErr);
    }

    ok(res, mentorship, 201);
  } catch (error) {
    console.error("Failed to request mentorship:", error);
    fail(res, "INTERNAL_ERROR", "Failed to create mentorship request", 500);
  }
}

// Accept a mentorship connection request
export async function acceptMentorship(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { id } = req.params;

  try {
    const mentorship = await prisma.alumniMentorship.findUnique({
      where: { id },
      include: {
        alumni: {
          include: { user: true }
        },
        student: {
          include: { user: true }
        },
        skill: true
      }
    });

    if (!mentorship) {
      fail(res, "NOT_FOUND", "Mentorship request not found", 404);
      return;
    }

    // Verify that the authenticated user is the alumnus of this mentorship record
    if (mentorship.alumni.userId !== req.user.id) {
      fail(res, "FORBIDDEN", "Only the assigned alumnus can accept this request", 403);
      return;
    }

    const updated = await prisma.alumniMentorship.update({
      where: { id },
      data: {
        status: "active",
        startedAt: new Date()
      }
    });

    // Notify the student
    try {
      await prisma.systemNotification.create({
        data: {
          userId: mentorship.student.userId,
          type: "MENTORSHIP_ACCEPTED",
          payload: {
            mentorName: mentorship.alumni.user.fullName || mentorship.alumni.user.githubHandle || "Mentor",
            skillName: mentorship.skill.name,
            mentorshipId: mentorship.id
          }
        }
      });
    } catch (notifErr) {
      console.error("Failed to notify student of accepted mentorship:", notifErr);
    }

    ok(res, updated);
  } catch (error) {
    console.error("Failed to accept mentorship:", error);
    fail(res, "INTERNAL_ERROR", "Failed to accept mentorship request", 500);
  }
}

// Complete a mentorship connection
export async function completeMentorship(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { id } = req.params;

  try {
    const mentorship = await prisma.alumniMentorship.findUnique({
      where: { id },
      include: {
        alumni: true
      }
    });

    if (!mentorship) {
      fail(res, "NOT_FOUND", "Mentorship request not found", 404);
      return;
    }

    // Verify that the authenticated user is the alumnus of this mentorship record
    if (mentorship.alumni.userId !== req.user.id) {
      fail(res, "FORBIDDEN", "Only the assigned alumnus can complete this connection", 403);
      return;
    }

    const updated = await prisma.alumniMentorship.update({
      where: { id },
      data: {
        status: "completed",
        endedAt: new Date()
      }
    });

    ok(res, updated);
  } catch (error) {
    console.error("Failed to complete mentorship:", error);
    fail(res, "INTERNAL_ERROR", "Failed to complete mentorship", 500);
  }
}

// Decline/Delete a mentorship connection request
export async function declineMentorship(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { id } = req.params;

  try {
    const mentorship = await prisma.alumniMentorship.findUnique({
      where: { id },
      include: {
        alumni: true
      }
    });

    if (!mentorship) {
      fail(res, "NOT_FOUND", "Mentorship request not found", 404);
      return;
    }

    // Verify that the authenticated user is the alumnus of this mentorship record
    if (mentorship.alumni.userId !== req.user.id) {
      fail(res, "FORBIDDEN", "Only the assigned alumnus can decline this request", 403);
      return;
    }

    await prisma.alumniMentorship.delete({
      where: { id }
    });

    ok(res, { message: "Mentorship request declined and removed successfully" });
  } catch (error) {
    console.error("Failed to decline mentorship:", error);
    fail(res, "INTERNAL_ERROR", "Failed to decline mentorship request", 500);
  }
}

// Setup/Register user as an Alumnus
export async function registerAlumni(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const {
    graduationYear,
    currentCompany,
    currentRole,
    yearsExperience,
    mentoringSkills,
    willingToMentor,
    linkedinUrl,
    alumniCardUrl
  } = req.body as {
    graduationYear?: number;
    currentCompany?: string;
    currentRole?: string;
    yearsExperience?: number;
    mentoringSkills?: string[];
    willingToMentor?: boolean;
    linkedinUrl?: string;
    alumniCardUrl?: string;
  };

  try {
    const existingProfile = await prisma.alumniProfile.findUnique({
      where: { userId: req.user.id }
    });

    let verified = false;
    if (existingProfile) {
      if (alumniCardUrl === undefined || alumniCardUrl === existingProfile.alumniCardUrl) {
        verified = existingProfile.verified;
      }
    }

    const profile = await prisma.alumniProfile.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        graduationYear,
        currentCompany,
        currentRole,
        yearsExperience,
        mentoringSkills: mentoringSkills || [],
        willingToMentor: willingToMentor !== undefined ? willingToMentor : true,
        linkedinUrl,
        alumniCardUrl,
        verified: false,
        universityId: req.user.universityId
      },
      update: {
        graduationYear,
        currentCompany,
        currentRole,
        yearsExperience,
        mentoringSkills: mentoringSkills || [],
        willingToMentor: willingToMentor !== undefined ? willingToMentor : true,
        linkedinUrl,
        alumniCardUrl: alumniCardUrl !== undefined ? alumniCardUrl : undefined,
        verified,
        universityId: req.user.universityId
      }
    });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { role: "alumni" }
    });

    setAuthCookies(res, updatedUser);

    ok(res, profile);
  } catch (error) {
    console.error("Failed to register alumnus profile:", error);
    fail(res, "INTERNAL_ERROR", "Failed to save alumnus profile", 500);
  }
}

// Fetch own alumni profile if registered
export async function getMyAlumniProfile(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  try {
    const profile = await prisma.alumniProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        mentorships: {
          include: {
            student: {
              include: { user: true }
            },
            skill: true
          }
        }
      }
    });

    ok(res, profile);
  } catch (error) {
    console.error("Failed to get own alumni profile:", error);
    fail(res, "INTERNAL_ERROR", "Failed to retrieve alumni profile", 500);
  }
}

export async function verifyMentorship(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { id } = req.params;

  try {
    const mentorship = await prisma.alumniMentorship.findUnique({
      where: { id },
      include: {
        alumni: { include: { user: true } },
        student: { include: { user: true } },
        skill: true
      }
    });

    if (!mentorship) {
      fail(res, "NOT_FOUND", "Mentorship connection not found", 404);
      return;
    }

    // Verify that the authenticated user is the alumnus
    if (mentorship.alumni.userId !== req.user.id) {
      fail(res, "FORBIDDEN", "Only the assigned alumnus can verify this mentorship", 403);
      return;
    }

    // Update mentorship connection status to completed in PostgreSQL
    const updated = await prisma.alumniMentorship.update({
      where: { id },
      data: {
        status: "completed",
        endedAt: new Date()
      }
    });

    // Write the validated skill to the student's Neo4j profile in graph-service
    try {
      const response = await fetch(`${env.GRAPH_SERVICE_URL}/graph/mentor/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: mentorship.student.userId,
          skillName: mentorship.skill.name
        })
      });
      if (!response.ok) {
        console.error("Failed to sync verified skill to Neo4j:", await response.text());
      }
    } catch (graphErr) {
      console.error("Failed to call graph-service for skill verification:", graphErr);
    }

    // Create a system notification for the student
    try {
      await prisma.systemNotification.create({
        data: {
          userId: mentorship.student.userId,
          type: "MENTORSHIP_COMPLETED",
          payload: {
            mentorName: mentorship.alumni.user.fullName,
            skillName: mentorship.skill.name,
            mentorshipId: mentorship.id
          }
        }
      });
    } catch (notifErr) {
      console.error("Failed to notify student of completed/verified mentorship:", notifErr);
    }

    ok(res, updated);
  } catch (error: any) {
    console.error("Failed to verify mentorship:", error);
    fail(res, "INTERNAL_ERROR", error.message || "Failed to verify mentorship", 500);
  }
}

