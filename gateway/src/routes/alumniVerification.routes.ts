import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  listPendingAlumni,
  verifyAlumni
} from "../controllers/alumniVerification.controller.js";

export const alumniVerificationRouter = Router();

alumniVerificationRouter.get(
  "/admin/alumni/pending",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(listPendingAlumni)
);

alumniVerificationRouter.post(
  "/admin/alumni/:id/verify",
  requireAuth,
  requireRole(["admin", "professor"]),
  asyncHandler(verifyAlumni)
)