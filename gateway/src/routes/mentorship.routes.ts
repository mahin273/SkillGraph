import { Router } from "express";
import {
  getRecommendedMentors,
  requestMentorship,
  acceptMentorship,
  completeMentorship,
  declineMentorship,
  getMentorshipMessages,
  registerAlumni,
  getMyAlumniProfile,
  verifyMentorship,
  sendMentorshipMessage,
  updateMentorshipMilestones,
  getMyMentorships
} from "../controllers/mentorship.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const mentorshipRouter = Router();

mentorshipRouter.get("/connections", requireAuth, asyncHandler(getMyMentorships));
mentorshipRouter.get("/profile", requireAuth, asyncHandler(getMyAlumniProfile));
mentorshipRouter.get("/recommended", requireAuth, asyncHandler(getRecommendedMentors));
mentorshipRouter.post("/request", requireAuth, asyncHandler(requestMentorship));
mentorshipRouter.put("/request/:id/accept", requireAuth, asyncHandler(acceptMentorship));
mentorshipRouter.put("/request/:id/complete", requireAuth, asyncHandler(completeMentorship));
mentorshipRouter.get("/request/:id/messages", requireAuth, asyncHandler(getMentorshipMessages));
mentorshipRouter.post("/request/:id/messages", requireAuth, asyncHandler(sendMentorshipMessage));
mentorshipRouter.put("/request/:id/milestones", requireAuth, asyncHandler(updateMentorshipMilestones));
mentorshipRouter.post("/request/:id/verify", requireAuth, asyncHandler(verifyMentorship));
mentorshipRouter.delete("/request/:id", requireAuth, asyncHandler(declineMentorship));
mentorshipRouter.post("/register", requireAuth, asyncHandler(registerAlumni));

