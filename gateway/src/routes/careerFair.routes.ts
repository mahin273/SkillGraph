import { Router } from "express";
import { getUpcomingFairs, getFairMatches, createCareerFair, getFairBooths } from "../controllers/careerFair.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const careerFairRouter = Router();

careerFairRouter.get("/upcoming", requireAuth, asyncHandler(getUpcomingFairs));
careerFairRouter.get("/:fairId/booths", requireAuth, asyncHandler(getFairBooths));
careerFairRouter.get("/:fairId/matches/:studentId", requireAuth, asyncHandler(getFairMatches));
careerFairRouter.post("/admin", requireAuth, asyncHandler(createCareerFair));
