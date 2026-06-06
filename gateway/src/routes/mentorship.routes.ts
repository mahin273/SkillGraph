import { Router } from "express";
import {
  getRecommendedMentors,
  requestMentorship,
  acceptMentorship,
  completeMentorship,
  declineMentorship,
  registerAlumni,
  getMyAlumniProfile,
  verifyMentorship
} from "../controllers/mentorship.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mentorshipRouter = Router();

mentorshipRouter.get("/profile", requireAuth, asyncHandler(getMyAlumniProfile));
mentorshipRouter.get("/recommended", requireAuth, asyncHandler(getRecommendedMentors));
mentorshipRouter.post("/request", requireAuth, asyncHandler(requestMentorship));
mentorshipRouter.put("/request/:id/accept", requireAuth, asyncHandler(acceptMentorship));
mentorshipRouter.put("/request/:id/complete", requireAuth, asyncHandler(completeMentorship));
mentorshipRouter.put("/request/:id/milestones", requireAuth, asyncHandler(async (req, res) => {
  res.json({ success: true, data: { status: "updated" } });
}));
mentorshipRouter.post("/request/:id/verify", requireAuth, asyncHandler(verifyMentorship));
mentorshipRouter.delete("/request/:id", requireAuth, asyncHandler(declineMentorship));
mentorshipRouter.post("/register", requireAuth, asyncHandler(registerAlumni));

