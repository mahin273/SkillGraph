import { Router } from "express";
import { getResumePreview, exportResumePdf, analyzeUploadedResume } from "../controllers/resume.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const resumeRouter = Router();

resumeRouter.get("/preview/:studentId", requireAuth, asyncHandler(getResumePreview));
resumeRouter.post("/generate", requireAuth, asyncHandler(exportResumePdf));
resumeRouter.post("/analyze", requireAuth, asyncHandler(analyzeUploadedResume));