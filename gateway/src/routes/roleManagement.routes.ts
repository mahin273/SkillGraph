import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listRoles,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/roleManagement.controller.js";

export const roleManagementRouter = Router();

roleManagementRouter.get(
  "/admin/roles",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listRoles)
);

roleManagementRouter.post(
  "/admin/roles",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(createRole)
);

roleManagementRouter.put(
  "/admin/roles/:id",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(updateRole)
);

roleManagementRouter.delete(
  "/admin/roles/:id",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(deleteRole)
);