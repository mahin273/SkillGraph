import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole, requireSuperAdmin } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listUsers,
  updateUser,
  listAuditLogs,
  getConfig,
  updateConfig,
  listStudents,
  listCourses,
  mapCourse,
  listCapstoneMatches,
  listAllSkills,
  getKpiStats,
  listAllJobs,
  listGithubConnections,
  listCategories,
  createCategory,
  createSkill,
  updateSkill,
  deleteSkill,
  exportAuditLogsCsv,
  extractSyllabusSkills,
  listAlumni,
  createInvitation,
  listUniversities,
  createUniversity,
  updateUniversity,
  getSystemHealth,
  getSecurityThreats,
  exportAnonymizedDataset
} from "../controllers/admin.controller.js";
import { saveTeamAssignments, loadTeamAssignments } from "../controllers/teamRequest.controller.js";

export const adminRouter = Router();

// Admin-only management endpoints
adminRouter.get(
  "/admin/users",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(listUsers)
);

adminRouter.patch(
  "/admin/users/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(updateUser)
);

adminRouter.post(
  "/admin/invitations",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(createInvitation)
);

adminRouter.get(
  "/admin/audit-logs",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(listAuditLogs)
);

adminRouter.get(
  "/admin/config",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(getConfig)
);

adminRouter.post(
  "/admin/config",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(updateConfig)
);

adminRouter.get(
  "/admin/skills",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listAllSkills)
);

adminRouter.get(
  "/admin/kpi-stats",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(getKpiStats)
);

// Professor & Admin shared academic advising endpoints
adminRouter.get(
  "/professor/students",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listStudents)
);

adminRouter.get(
  "/professor/courses",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listCourses)
);

adminRouter.post(
  "/professor/courses",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(mapCourse)
);

adminRouter.get(
  "/professor/capstone-matches",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listCapstoneMatches)
);

// Advanced Administrator features (Admin only)
adminRouter.get(
  "/admin/jobs",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(listAllJobs)
);

adminRouter.get(
  "/admin/github-connections",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(listGithubConnections)
);

adminRouter.get(
  "/admin/categories",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(listCategories)
);

adminRouter.post(
  "/admin/categories",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(createCategory)
);

adminRouter.post(
  "/admin/skills",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(createSkill)
);

adminRouter.put(
  "/admin/skills/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(updateSkill)
);

adminRouter.delete(
  "/admin/skills/:id",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(deleteSkill)
);

adminRouter.get(
  "/admin/audit-logs/export",
  requireAuth,
  requireRole(["admin"]),
  asyncHandler(exportAuditLogsCsv)
);

adminRouter.post(
  "/professor/courses/extract-skills",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(extractSyllabusSkills)
);

adminRouter.get(
  "/professor/alumni",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listAlumni)
);

// Super Admin platform-wide operations
adminRouter.get(
  "/admin/universities",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(listUniversities)
);

adminRouter.post(
  "/admin/universities",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(createUniversity)
);

adminRouter.put(
  "/admin/universities/:id",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(updateUniversity)
);

adminRouter.get(
  "/admin/health",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(getSystemHealth)
);

adminRouter.get(
  "/admin/security/threats",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(getSecurityThreats)
);

adminRouter.get(
  "/admin/export-anonymized",
  requireAuth,
  requireSuperAdmin,
  asyncHandler(exportAnonymizedDataset)
);

adminRouter.post(
  "/admin/team-requests/save",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(saveTeamAssignments)
);

adminRouter.get(
  "/admin/team-requests/load",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(loadTeamAssignments)
);