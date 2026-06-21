import { Router } from "express";
import {
  getResources,
  getPathResources,
  completeResource,
  getCompletedResources
} from "../controllers/resources.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const resourcesRouter = Router();

resourcesRouter.get("/", asyncHandler(getResources));
resourcesRouter.get("/path/:pathId", asyncHandler(getPathResources));
resourcesRouter.post("/complete", requireAuth, asyncHandler(completeResource));
resourcesRouter.get("/completed/:studentId", requireAuth, asyncHandler(getCompletedResources));