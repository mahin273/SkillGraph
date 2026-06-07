import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";

export async function getResources(req: Request, res: Response) {
  const { skill } = req.query as { skill?: string };

  if (!skill) {
    fail(res, "INVALID_QUERY", "skill name is required", 400);
    return;
  }

  const resources = await prisma.learningResource.findMany({
    where: {
      skills: {
        some: {
          skill: {
            name: {
              equals: skill,
              mode: "insensitive"
            }
          }
        }
      }
    },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    },
    orderBy: [
      { isUniversityApproved: "desc" },
      { rating: "desc" }
    ]
  });

  ok(res, resources);
}

export async function getPathResources(req: Request, res: Response) {
  const { pathId } = req.params;

  if (!pathId) {
    fail(res, "INVALID_PATH", "pathId is required", 400);
    return;
  }

  const path = await prisma.studentLearningPath.findUnique({
    where: { id: pathId }
  });

  if (!path) {
    fail(res, "PATH_NOT_FOUND", "Learning path not found", 404);
    return;
  }

  if (!path.missingSkillsJson) {
    ok(res, []);
    return;
  }

  const missingSkills = path.missingSkillsJson as Array<any>;
  const skillIds: string[] = [];
  const skillNames: string[] = [];

  for (const s of missingSkills) {
    if (typeof s === "string") {
      skillNames.push(s);
    } else if (s && typeof s === "object") {
      if (s.id) {
        skillIds.push(s.id);
      } else if (s.name) {
        skillNames.push(s.name);
      }
    }
  }

  if (skillIds.length === 0 && skillNames.length === 0) {
    ok(res, []);
    return;
  }

  const conditions: any[] = [];
  if (skillIds.length > 0) {
    conditions.push({ skillId: { in: skillIds } });
  }
  if (skillNames.length > 0) {
    conditions.push({ skill: { name: { in: skillNames, mode: "insensitive" } } });
  }

  const resources = await prisma.learningResource.findMany({
    where: {
      skills: {
        some: {
          OR: conditions
        }
      }
    },
    include: {
      skills: {
        include: {
          skill: true
        }
      }
    },
    orderBy: [
      { isUniversityApproved: "desc" },
      { rating: "desc" }
    ]
  });

  ok(res, resources);
}

export async function completeResource(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { resourceId, completed } = req.body as { resourceId?: string; completed?: boolean };

  if (!resourceId) {
    fail(res, "INVALID_BODY", "resourceId is required", 400);
    return;
  }

  const student = await prisma.studentProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!student) {
    fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
    return;
  }

  if (completed === false) {
    await prisma.studentResourceCompletion.deleteMany({
      where: {
        studentId: student.id,
        resourceId
      }
    });
    ok(res, { completed: false });
  } else {
    const completion = await prisma.studentResourceCompletion.upsert({
      where: {
        studentId_resourceId: {
          studentId: student.id,
          resourceId
        }
      },
      update: {},
      create: {
        studentId: student.id,
        resourceId
      }
    });
    ok(res, completion, 201);
  }
}

export async function getCompletedResources(req: Request, res: Response) {
  let targetStudentId = req.params.studentId;

  if (targetStudentId === "me") {
    if (!req.user) {
      fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
      return;
    }
    const student = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id }
    });
    if (!student) {
      fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
      return;
    }
    targetStudentId = student.id;
  }

  const completions = await prisma.studentResourceCompletion.findMany({
    where: { studentId: targetStudentId },
    include: {
      resource: {
        include: {
          skills: {
            include: {
              skill: true
            }
          }
        }
      }
    },
    orderBy: { completedAt: "desc" }
  });

  ok(res, completions.map((c) => c.resource));
}