import type { Request, Response } from "express";
import { prisma } from "@skillgraph/database";
import { fail, ok } from "../utils/apiResponse.js";
import { env } from "../config/env.js";

export async function getDecayedSkills(req: Request, res: Response) {
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

  const decayed = await prisma.skillDecayAudit.findMany({
    where: {
      studentId: targetStudentId,
      isDormant: true
    },
    orderBy: { lastActiveDate: "asc" }
  });

  ok(res, decayed);
}

export async function reactivateSkill(req: Request, res: Response) {
  if (!req.user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return;
  }

  const { skillName } = req.body as { skillName?: string };

  if (!skillName) {
    fail(res, "INVALID_BODY", "skillName is required", 400);
    return;
  }

  const student = await prisma.studentProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!student) {
    fail(res, "STUDENT_NOT_FOUND", "Student profile not found", 404);
    return;
  }

  // 1. Delete or deactivate SkillDecayAudit in PG
  await prisma.skillDecayAudit.deleteMany({
    where: {
      studentId: student.id,
      skillName
    }
  });

  // 2. Call Graph service to update Neo4j properties
  try {
    const graphResponse = await fetch(`${env.GRAPH_SERVICE_URL}/graph/reactivate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        studentId: req.user.id,
        skillName
      })
    });

    if (!graphResponse.ok) {
      console.error(`Graph service reactivate failed: ${graphResponse.statusText}`);
      fail(res, "GRAPH_UPDATE_FAILED", "Failed to update skill in graph database", 502);
      return;
    }

    ok(res, { success: true });
  } catch (error) {
    console.error("Error communicating with graph service:", error);
    fail(res, "INTERNAL_ERROR", "Failed to reactivate skill in graph", 500);
  }
}