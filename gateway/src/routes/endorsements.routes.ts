import { Router } from "express";
import { deleteEndorsement, listEndorsements, submitEndorsement } from "../controllers/endorsements.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const endorsementsRouter = Router();

endorsementsRouter.post("/submit", requireAuth, asyncHandler(submitEndorsement));
endorsementsRouter.get("/:studentId", asyncHandler(listEndorsements));
endorsementsRouter.delete("/:id", requireAuth, asyncHandler(deleteEndorsement));
