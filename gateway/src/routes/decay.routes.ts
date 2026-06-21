import { Router } from "express";
import { getDecayedSkills, reactivateSkill } from "../controllers/decay.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const decayRouter = Router();

decayRouter.get("/decayed/:studentId", requireAuth, asyncHandler(getDecayedSkills));
decayRouter.post("/reactivate", requireAuth, asyncHandler(reactivateSkill));