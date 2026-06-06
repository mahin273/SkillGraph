import { Router } from "express";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { CircuitBreaker } from "../utils/circuitBreaker.js";
import { prisma } from "@skillgraph/database";
import { fail } from "../utils/apiResponse.js";
import { searchTalents, sendInterviewInvite } from "../controllers/careerFair.controller.js";

export const proxyRouter = Router();

const graphCircuitBreaker = new CircuitBreaker("graph-service", 3, 10000);

async function proxyToGraph(
  url: string,
  options: RequestInit = {}
): Promise<{ status: number; data: any }> {
  const fallback = {
    status: 503,
    data: {
      success: false,
      error: { message: "Internal graph-service is temporarily unavailable (circuit breaker active)" }
    }
  };

  return graphCircuitBreaker.execute(async () => {
    const response = await fetch(url, options);
    if (!response.ok && response.status >= 500) {
      throw new Error(`Downstream server error: ${response.status}`);
    }
    return {
      status: response.status,
      data: await response.json()
    };
  }, fallback);
}

async function checkStudentAccess(req: any, res: any, studentId: string): Promise<boolean> {
  const user = req.user;
  if (!user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return false;
  }

  // 1. Super Admin has global access
  if (user.role === "superadmin") {
    return true;
  }

  // 2. Resolve target student
  const student = await prisma.user.findFirst({
    where: {
      OR: [
        { id: studentId },
        { studentProfile: { id: studentId } }
      ],
      role: "student"
    },
    select: { id: true, universityId: true }
  });

  if (!student) {
    fail(res, "NOT_FOUND", "Student not found or is not a student", 404);
    return false;
  }

  // 3. Student can only access their own data
  if (user.role === "student") {
    if (user.id === student.id) {
      return true;
    }
    fail(res, "FORBIDDEN", "Students can only access their own data", 403);
    return false;
  }

  // 4. Professor or University Admin can access if in the same university
  if ((user.role === "professor" || user.role === "admin") && user.universityId) {
    if (user.universityId === student.universityId) {
      return true;
    }
    fail(res, "FORBIDDEN", "You can only access students from your own university", 403);
    return false;
  }

  // 5. Block anyone else
  fail(res, "FORBIDDEN", "You do not have permission to access this student's data", 403);
  return false;
}

async function checkMultipleStudentsAccess(req: any, res: any, studentIds: string[]): Promise<boolean> {
  const user = req.user;
  if (!user) {
    fail(res, "UNAUTHORIZED", "Missing authenticated user", 401);
    return false;
  }

  // 1. Super Admin has global access
  if (user.role === "superadmin") {
    return true;
  }

  // 2. Resolve target students
  const students = await prisma.user.findMany({
    where: {
      id: { in: studentIds },
      role: "student"
    },
    select: { id: true, universityId: true }
  });

  // 3. Student can only access their own data
  if (user.role === "student") {
    const isOnlySelf = studentIds.every(id => id === user.id);
    if (!isOnlySelf) {
      fail(res, "FORBIDDEN", "Students can only access their own data", 403);
      return false;
    }
    return true;
  }

  // 4. Professor or University Admin can access if in the same university
  if ((user.role === "professor" || user.role === "admin") && user.universityId) {
    const invalidStudent = students.find(s => s.universityId !== user.universityId);
    if (invalidStudent) {
      fail(res, "FORBIDDEN", "You can only access students from your own university", 403);
      return false;
    }
    return true;
  }

  // 5. Block anyone else
  fail(res, "FORBIDDEN", "You do not have permission to access these students' data", 403);
  return false;
}

proxyRouter.get("/graph/roles", requireAuth, asyncHandler(async (_req, res) => {
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/roles`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/graph/student/:id/skills", requireAuth, asyncHandler(async (req, res) => {
  const studentId = req.params.id;
  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/student/${studentId}/skills`);
  res.status(result.status).json(result.data);
}));

proxyRouter.post("/graph/students/skills", requireAuth, asyncHandler(async (req, res) => {
  const { studentIds } = req.body;
  if (!Array.isArray(studentIds)) {
    fail(res, "INVALID_BODY", "studentIds must be an array of strings", 400);
    return;
  }

  const isAuthorized = await checkMultipleStudentsAccess(req, res, studentIds);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/students/skills`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentIds })
  });
  res.status(result.status).json(result.data);
}));


proxyRouter.get("/graph/galaxy/:studentId", requireAuth, asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;
  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/galaxy/${studentId}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/graph/skills/all", requireAuth, asyncHandler(async (_req, res) => {
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/skills/all`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/public/galaxy/:handle", asyncHandler(async (req, res) => {
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/public/galaxy/${req.params.handle}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.post("/matchmaker/candidates", requireAuth, asyncHandler(async (req, res) => {
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/matchmaker/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...req.body,
      requesterId: req.user!.id
    })
  });
  res.status(result.status).json(result.data);
}));

// Career GPS routes
proxyRouter.get("/career-gps", requireAuth, asyncHandler(async (req, res) => {
  const { studentId, targetRoleId } = req.query;
  if (!studentId || typeof studentId !== "string") {
    fail(res, "INVALID_QUERY", "studentId is required", 400);
    return;
  }

  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/career-gps?studentId=${studentId}&targetRoleId=${targetRoleId}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.post("/career-gps/save", requireAuth, asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId || typeof studentId !== "string") {
    fail(res, "INVALID_BODY", "studentId is required", 400);
    return;
  }

  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/career-gps/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body)
  });
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/career-gps/history/:studentId", requireAuth, asyncHandler(async (req, res) => {
  const studentId = req.params.studentId;
  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/career-gps/history/${studentId}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/admin/analytics/skill-heatmap", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(async (req, res) => {
  const uid = req.user?.universityId ? `?universityId=${req.user.universityId}` : '';
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/analytics/skill-heatmap${uid}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/admin/analytics/industry-gap", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(async (req, res) => {
  const uid = req.user?.universityId ? `?universityId=${req.user.universityId}` : '';
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/analytics/industry-gap${uid}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/admin/analytics/missing-skills", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(async (req, res) => {
  const uid = req.user?.universityId ? `?universityId=${req.user.universityId}` : '';
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/analytics/missing-skills${uid}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/admin/analytics/trend", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(async (req, res) => {
  const uid = req.user?.universityId ? `?universityId=${req.user.universityId}` : '';
  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/analytics/trend${uid}`);
  res.status(result.status).json(result.data);
}));

proxyRouter.post("/simulator/run", requireAuth, asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId || typeof studentId !== "string") {
    fail(res, "INVALID_BODY", "studentId is required", 400);
    return;
  }

  const isAuthorized = await checkStudentAccess(req, res, studentId);
  if (!isAuthorized) return;

  const result = await proxyToGraph(`${env.GRAPH_SERVICE_URL}/graph/simulator/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req.body)
  });
  res.status(result.status).json(result.data);
}));

proxyRouter.get("/admin/career-fairs/:fairId/search-talents", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(searchTalents));
proxyRouter.post("/admin/career-fairs/invite", requireAuth, requireRole(["admin", "professor", "alumni"]), asyncHandler(sendInterviewInvite));
