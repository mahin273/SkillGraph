import { Router } from "express";
import {
  createDepartment,
  createUniversity,
  getAcademicOptions,
  getCurrentUser,
  getSocketToken,
  githubCallback,
  googleCallback,
  loginWithEmail,
  logout,
  redirectToGithub,
  redirectToGoogle,
  registerWithEmail,
  updateAcademicProfile,
  updateUserRole,
  verifyEmail,
  getInvitationDetails
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authRouter = Router();

authRouter.get("/github", redirectToGithub);
authRouter.get("/github/callback", asyncHandler(githubCallback));
authRouter.get("/google", redirectToGoogle);
authRouter.get("/google/callback", asyncHandler(googleCallback));
authRouter.post("/register", asyncHandler(registerWithEmail));
authRouter.post("/login", asyncHandler(loginWithEmail));
authRouter.post("/verify-email", asyncHandler(verifyEmail));
authRouter.get("/verify-email", asyncHandler(verifyEmail));
authRouter.get("/me", requireAuth, asyncHandler(getCurrentUser));
authRouter.get("/academic-options", requireAuth, asyncHandler(getAcademicOptions));
authRouter.post("/universities", requireAuth, asyncHandler(createUniversity));
authRouter.post("/departments", requireAuth, asyncHandler(createDepartment));
authRouter.patch("/academic-profile", requireAuth, asyncHandler(updateAcademicProfile));
authRouter.patch("/role", requireAuth, asyncHandler(updateUserRole));
authRouter.get("/socket-token", requireAuth, getSocketToken);
authRouter.get("/invite/:token", asyncHandler(getInvitationDetails));
authRouter.post("/refresh", requireAuth, (_req, res) => res.json({ success: true, data: null }));
authRouter.post("/logout", requireAuth, logout);